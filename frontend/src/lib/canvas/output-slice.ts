import type { NormalizedBBox } from "@/lib/canvas/crop-region";
import type { NodeCachedOutput } from "@/lib/canvas/types";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";

/**
 * Collection model.
 *
 * Every node output is a collection of typed items — a single page is a
 * collection of one. Source handles address either the whole collection
 * (`output`), one item (`item:<kind>:<id>`) or a group of items
 * (`items:<kind>:<id>,<id>,…`). Downstream nodes receive the sliced output
 * with the same `kind`, so nothing else needs to know how it was wired.
 */

export type ItemKind = "region" | "figure" | "line" | "table" | "page" | "formula";

export type ParsedSourceHandle =
  | { scope: "all" }
  | { scope: "item"; itemKind: ItemKind; itemId: string; pageIndex?: number }
  | { scope: "group"; itemKind: ItemKind; itemIds: string[]; pageIndex?: number };

const ITEM_KINDS = new Set<ItemKind>(["region", "figure", "line", "table", "page", "formula"]);
const ITEM_HANDLE_RE = /^item:([a-z]+):(.+)$/;
const GROUP_HANDLE_RE = /^items:([a-z]+):(.+)$/;
const GROUP_SEPARATOR = ",";
/** Items of a mapped output live on a page: `item:region:r1@3` = r1 of page 4. */
const PAGE_SUFFIX = "@";

/** Key of the array inside `raw` that holds each item kind. */
const RAW_LIST_KEY: Record<Exclude<ItemKind, "page">, string> = {
  region: "regions",
  figure: "figures",
  line: "lines",
  table: "tables",
  formula: "formulas",
};

/** Output kinds that carry each item kind (page handled separately). */
const OUTPUT_KIND_FOR_ITEM: Record<Exclude<ItemKind, "page">, NodeCachedOutput["kind"]> = {
  region: "regions",
  figure: "figures",
  line: "lines",
  table: "tables",
  formula: "formulas",
};

export function buildItemHandle(
  itemKind: ItemKind,
  itemId: string,
  pageIndex?: number,
): string {
  const suffix = pageIndex !== undefined && itemKind !== "page" ? `${PAGE_SUFFIX}${pageIndex}` : "";
  return `item:${itemKind}:${itemId}${suffix}`;
}

export function buildGroupHandle(
  itemKind: ItemKind,
  itemIds: string[],
  pageIndex?: number,
): string {
  const suffix = pageIndex !== undefined && itemKind !== "page" ? `${PAGE_SUFFIX}${pageIndex}` : "";
  return `items:${itemKind}:${itemIds.map(encodeURIComponent).join(GROUP_SEPARATOR)}${suffix}`;
}

function splitPageSuffix(value: string): { body: string; pageIndex?: number } {
  const at = value.lastIndexOf(PAGE_SUFFIX);
  if (at <= 0) return { body: value };
  const page = Number(value.slice(at + 1));
  if (!Number.isInteger(page) || page < 0) return { body: value };
  return { body: value.slice(0, at), pageIndex: page };
}

export function parseSourceHandle(
  handle: string | null | undefined,
): ParsedSourceHandle {
  if (!handle || handle === "output") {
    return { scope: "all" };
  }
  const item = ITEM_HANDLE_RE.exec(handle);
  if (item && ITEM_KINDS.has(item[1] as ItemKind)) {
    const kind = item[1] as ItemKind;
    const { body, pageIndex } = kind === "page" ? { body: item[2] } : splitPageSuffix(item[2]);
    return pageIndex === undefined
      ? { scope: "item", itemKind: kind, itemId: body }
      : { scope: "item", itemKind: kind, itemId: body, pageIndex };
  }
  const group = GROUP_HANDLE_RE.exec(handle);
  if (group && ITEM_KINDS.has(group[1] as ItemKind)) {
    const kind = group[1] as ItemKind;
    const { body, pageIndex } = kind === "page" ? { body: group[2] } : splitPageSuffix(group[2]);
    const itemIds = body
      .split(GROUP_SEPARATOR)
      .map((id) => decodeURIComponent(id))
      .filter(Boolean);
    const page = pageIndex === undefined ? {} : { pageIndex };
    if (itemIds.length === 1) {
      return { scope: "item", itemKind: kind, itemId: itemIds[0], ...page };
    }
    return { scope: "group", itemKind: kind, itemIds, ...page };
  }
  return { scope: "all" };
}

/** Ids addressed by a handle, or null for the whole collection. */
export function handleItemIds(handle: string | null | undefined): string[] | null {
  const parsed = parseSourceHandle(handle);
  if (parsed.scope === "all") return null;
  if (parsed.scope === "item") return [parsed.itemId];
  return parsed.itemIds;
}

type Identifiable = { id?: string };

function rawList<T>(output: NodeCachedOutput, key: string): T[] {
  const raw = output.raw as Record<string, unknown> | null;
  const list = raw?.[key];
  return Array.isArray(list) ? (list as T[]) : [];
}

function pageOutput(page: PageArtifactWire): NodeCachedOutput {
  const pageImg = page.page;
  return {
    kind: "page",
    raw: { page },
    preview: {
      pageCount: 1,
      pageImage: pageImg,
      thumbnailBase64: pageImg?.image_base64,
    },
  };
}

function pagesOf(output: NodeCachedOutput): PageArtifactWire[] {
  if (output.kind === "pages") return rawList<PageArtifactWire>(output, "pages");
  if (output.kind === "page") {
    const page = (output.raw as { page?: PageArtifactWire }).page;
    return page ? [page] : [];
  }
  return [];
}

function slicePages(
  output: NodeCachedOutput,
  indexes: number[],
): NodeCachedOutput | null {
  const wanted = new Set(indexes);
  const pages = pagesOf(output).filter((page) => wanted.has(page.page_index));
  if (!pages.length) return null;
  if (pages.length === 1 && indexes.length === 1) return pageOutput(pages[0]);
  return {
    kind: "pages",
    raw: { ...(output.raw as object), pages },
    preview: {
      ...output.preview,
      pageCount: pages.length,
      itemCount: pages.length,
      pageImage: pages[0].page,
      thumbnailBase64: pages[0].page?.image_base64,
    },
  };
}

function sliceList(
  output: NodeCachedOutput,
  itemKind: Exclude<ItemKind, "page">,
  ids: string[],
): NodeCachedOutput | null {
  const key = RAW_LIST_KEY[itemKind];
  const expectedKind = OUTPUT_KIND_FOR_ITEM[itemKind];
  // Layout regions may also ride inside a page artifact.
  if (output.kind !== expectedKind && !(itemKind === "region" && output.kind === "page")) {
    return null;
  }
  const wanted = new Set(ids);
  const items = rawList<Identifiable>(output, key).filter(
    (item) => item.id !== undefined && wanted.has(item.id),
  );
  if (!items.length) return null;
  return {
    kind: expectedKind,
    raw: { ...(output.raw as object), [key]: items },
    preview: { ...output.preview, itemCount: items.length },
  };
}

/** Narrow an output to whatever the handle addresses (same kind, fewer items). */
export function sliceOutputByHandle(
  output: NodeCachedOutput | null,
  handle: string | null | undefined,
): NodeCachedOutput | null {
  if (!output) return null;
  const parsed = parseSourceHandle(handle);
  if (parsed.scope === "all") return output;
  const ids = parsed.scope === "item" ? [parsed.itemId] : parsed.itemIds;

  // Items addressed on a specific page of a mapped output.
  if (parsed.pageIndex !== undefined && output.mapped?.length) {
    const page = output.mapped.find((entry) => entry.page_index === parsed.pageIndex);
    if (!page || page.error) return null;
    output = page.output;
  }

  if (parsed.itemKind === "page") {
    const indexes = ids.map(Number).filter((n) => !Number.isNaN(n));
    if (!indexes.length) return null;
    return slicePages(output, indexes);
  }
  return sliceList(output, parsed.itemKind, ids);
}

/* ------------------------------------------------------------------ */
/* Item descriptors                                                    */
/* ------------------------------------------------------------------ */

export type OutputListItem = {
  handle: string;
  id: string;
  label: string;
  itemKind: ItemKind;
};

/** Everything a gallery needs to draw one item of a collection. */
export type CollectionItem = OutputListItem & {
  index: number;
  sublabel?: string;
  /** Normalized bbox on the page image, when the item is a region of it. */
  bbox?: NormalizedBBox;
  pageIndex?: number;
  confidence?: number;
  /** Text body (lines, captions, LaTeX). */
  text?: string;
  /** Own raster (pages). */
  image?: { base64?: string; url?: string; width?: number; height?: number };
};

function isBBox(value: unknown): value is NormalizedBBox {
  return Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === "number");
}

function prettyLabel(label: string): string {
  return label
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

/** Rich item list for galleries and previews. */
export function listCollectionItems(output: NodeCachedOutput | null): CollectionItem[] {
  if (!output) return [];
  const pageIndex = (output.raw as { page_index?: number } | null)?.page_index;

  switch (output.kind) {
    case "pages":
    case "page":
      return pagesOf(output).map((page, index) => ({
        itemKind: "page",
        id: String(page.page_index),
        handle: buildItemHandle("page", String(page.page_index)),
        index,
        label: `Page ${page.page_index + 1}`,
        sublabel:
          page.page?.width && page.page?.height
            ? `${page.page.width}×${page.page.height}`
            : undefined,
        pageIndex: page.page_index,
        image: page.page
          ? {
              base64: page.page.image_base64,
              url: page.page.image_url,
              width: page.page.width,
              height: page.page.height,
            }
          : undefined,
      }));
    case "regions":
      return rawList<{
        id: string;
        label?: string;
        docling_label?: string | null;
        provider_label?: string | null;
        bbox?: unknown;
        confidence?: number | null;
      }>(output, "regions")
        .filter((region) => region?.id)
        .map((region, index) => {
          const label = region.docling_label ?? region.provider_label ?? region.label ?? "region";
          return {
            itemKind: "region",
            id: region.id,
            handle: buildItemHandle("region", region.id),
            index,
            label: prettyLabel(label),
            sublabel: region.id,
            bbox: isBBox(region.bbox) ? region.bbox : undefined,
            pageIndex,
            confidence: region.confidence ?? undefined,
          };
        });
    case "figures":
      return rawList<{
        id: string;
        category?: string | null;
        caption?: string | null;
        description?: string | null;
        bbox?: unknown;
      }>(output, "figures")
        .filter((figure) => figure?.id)
        .map((figure, index) => ({
          itemKind: "figure",
          id: figure.id,
          handle: buildItemHandle("figure", figure.id),
          index,
          label: figure.category ? prettyLabel(figure.category) : `Figure ${index + 1}`,
          sublabel: figure.id,
          bbox: isBBox(figure.bbox) ? figure.bbox : undefined,
          pageIndex,
          text: figure.description ?? figure.caption ?? undefined,
        }));
    case "lines":
      return rawList<{
        id: string;
        text?: string | null;
        confidence?: number | null;
        bbox?: unknown;
      }>(output, "lines")
        .filter((line) => line?.id)
        .map((line, index) => ({
          itemKind: "line",
          id: line.id,
          handle: buildItemHandle("line", line.id),
          index,
          label: line.text?.trim() ? line.text.trim().slice(0, 60) : `Line ${index + 1}`,
          sublabel: line.id,
          bbox: isBBox(line.bbox) ? line.bbox : undefined,
          pageIndex,
          confidence: line.confidence ?? undefined,
          text: line.text ?? undefined,
        }));
    case "tables":
      return rawList<{ id: string; rows?: number; cols?: number; bbox?: unknown }>(
        output,
        "tables",
      )
        .filter((table) => table?.id)
        .map((table, index) => ({
          itemKind: "table",
          id: table.id,
          handle: buildItemHandle("table", table.id),
          index,
          label: `Table ${index + 1}`,
          sublabel:
            table.rows !== undefined && table.cols !== undefined
              ? `${table.rows}×${table.cols}`
              : table.id,
          bbox: isBBox(table.bbox) ? table.bbox : undefined,
          pageIndex,
        }));
    case "formulas":
      return rawList<{ id: string; latex?: string; inline?: boolean; bbox?: unknown }>(
        output,
        "formulas",
      )
        .filter((formula) => formula?.id)
        .map((formula, index) => ({
          itemKind: "formula",
          id: formula.id,
          handle: buildItemHandle("formula", formula.id),
          index,
          label: `Formula ${index + 1}`,
          sublabel: formula.inline ? "inline" : undefined,
          bbox: isBBox(formula.bbox) ? formula.bbox : undefined,
          pageIndex,
          text: formula.latex,
        }));
    default:
      return [];
  }
}

/** Compact item list (handle + label) — kept for edge labels and validation. */
export function listOutputItems(output: NodeCachedOutput | null): OutputListItem[] {
  return listCollectionItems(output).map(({ handle, id, label, itemKind }) => ({
    handle,
    id,
    label:
      // Regions and figures keep the raw provider label here (edge labels,
      // tests), lines their snippet, pages "Page N".
      itemKind === "region" || itemKind === "figure" ? rawLabelFor(output, itemKind, id) ?? label : label,
    itemKind,
  }));
}

function rawLabelFor(
  output: NodeCachedOutput | null,
  itemKind: "region" | "figure",
  id: string,
): string | undefined {
  if (!output) return undefined;
  if (itemKind === "region") {
    const region = rawList<{ id: string; label?: string; docling_label?: string | null }>(
      output,
      "regions",
    ).find((entry) => entry.id === id);
    return region ? (region.docling_label ?? region.label ?? region.id) : undefined;
  }
  const figure = rawList<{ id: string; category?: string | null }>(output, "figures").find(
    (entry) => entry.id === id,
  );
  return figure ? (figure.category ?? figure.id) : undefined;
}
