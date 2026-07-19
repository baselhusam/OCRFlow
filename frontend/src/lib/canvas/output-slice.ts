import type { NodeCachedOutput } from "@/lib/canvas/types";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";

export type ItemKind = "region" | "figure" | "line" | "table" | "page";

export type ParsedSourceHandle =
  | { scope: "all" }
  | { scope: "item"; itemKind: ItemKind; itemId: string };

const ITEM_HANDLE_RE = /^item:(region|figure|line|table|page):(.+)$/;

export function buildItemHandle(itemKind: ItemKind, itemId: string): string {
  return `item:${itemKind}:${itemId}`;
}

export function parseSourceHandle(
  handle: string | null | undefined,
): ParsedSourceHandle {
  if (!handle || handle === "output") {
    return { scope: "all" };
  }
  const match = ITEM_HANDLE_RE.exec(handle);
  if (!match) {
    return { scope: "all" };
  }
  return {
    scope: "item",
    itemKind: match[1] as ItemKind,
    itemId: match[2],
  };
}

type Identifiable = { id?: string; page_index?: number };

function findById<T extends Identifiable>(
  items: T[],
  id: string,
): T | undefined {
  return items.find((item) => item.id === id);
}

function findPageByIndex(
  output: NodeCachedOutput,
  pageIndex: number,
): NodeCachedOutput | null {
  if (output.kind === "pages") {
    const pages =
      (output.raw as { pages?: PageArtifactWire[] }).pages ?? [];
    const page = pages.find((p) => p.page_index === pageIndex);
    if (!page) return null;
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
  if (output.kind === "page") {
    const raw = output.raw as { page?: { page_index?: number } };
    const idx = raw.page?.page_index;
    if (idx !== undefined && idx !== pageIndex) return null;
    return output;
  }
  return null;
}

export function sliceOutputByHandle(
  output: NodeCachedOutput | null,
  handle: string | null | undefined,
): NodeCachedOutput | null {
  if (!output) return null;

  const parsed = parseSourceHandle(handle);
  if (parsed.scope === "all") return output;

  const preview = output.preview;

  switch (parsed.itemKind) {
    case "region": {
      if (output.kind !== "regions" && output.kind !== "page") return null;
      const regions =
        output.kind === "regions"
          ? ((output.raw as { regions?: Identifiable[] }).regions ?? [])
          : ((output.raw as { regions?: Identifiable[] }).regions ?? []);
      const region = findById(regions, parsed.itemId);
      if (!region) return null;
      return {
        kind: "regions",
        raw: {
          ...(output.raw as object),
          regions: [region],
        },
        preview: {
          ...preview,
          itemCount: 1,
        },
      };
    }
    case "figure": {
      const figures =
        output.kind === "figures"
          ? ((output.raw as { figures?: Identifiable[] }).figures ?? [])
          : [];
      const figure = findById(figures, parsed.itemId);
      if (!figure) return null;
      return {
        kind: "figures",
        raw: {
          ...(output.raw as object),
          figures: [figure],
        },
        preview: {
          ...preview,
          itemCount: 1,
        },
      };
    }
    case "line": {
      const lines =
        output.kind === "lines"
          ? ((output.raw as { lines?: Identifiable[] }).lines ?? [])
          : [];
      const line = findById(lines, parsed.itemId);
      if (!line) return null;
      return {
        kind: "lines",
        raw: {
          ...(output.raw as object),
          lines: [line],
        },
        preview: {
          ...preview,
          itemCount: 1,
        },
      };
    }
    case "table": {
      const tables =
        output.kind === "tables"
          ? ((output.raw as { tables?: Identifiable[] }).tables ?? [])
          : [];
      const table = findById(tables, parsed.itemId);
      if (!table) return null;
      return {
        kind: "tables",
        raw: {
          ...(output.raw as object),
          tables: [table],
        },
        preview: {
          ...preview,
          itemCount: 1,
        },
      };
    }
    case "page": {
      const pageIndex = Number(parsed.itemId);
      if (Number.isNaN(pageIndex)) return null;
      return findPageByIndex(output, pageIndex);
    }
    default:
      return output;
  }
}

export type OutputListItem = {
  handle: string;
  id: string;
  label: string;
  itemKind: ItemKind;
};

export function listOutputItems(output: NodeCachedOutput | null): OutputListItem[] {
  if (!output) return [];

  switch (output.kind) {
    case "regions": {
      const regions =
        (output.raw as { regions?: Array<{ id: string; label?: string; docling_label?: string | null }> })
          .regions ?? [];
      return regions.map((r) => ({
        handle: buildItemHandle("region", r.id),
        id: r.id,
        label: r.docling_label ?? r.label ?? r.id,
        itemKind: "region" as const,
      }));
    }
    case "figures": {
      const figures =
        (output.raw as { figures?: Array<{ id: string; category?: string | null }> }).figures ?? [];
      return figures.map((f) => ({
        handle: buildItemHandle("figure", f.id),
        id: f.id,
        label: f.category ?? f.id,
        itemKind: "figure" as const,
      }));
    }
    case "lines": {
      const lines =
        (output.raw as { lines?: Array<{ id: string; text?: string | null }> }).lines ?? [];
      return lines.map((l) => ({
        handle: buildItemHandle("line", l.id),
        id: l.id,
        label: l.text?.slice(0, 40) ?? l.id,
        itemKind: "line" as const,
      }));
    }
    case "tables": {
      const tables =
        (output.raw as { tables?: Array<{ id: string }> }).tables ?? [];
      return tables.map((t) => ({
        handle: buildItemHandle("table", t.id),
        id: t.id,
        label: t.id,
        itemKind: "table" as const,
      }));
    }
    case "pages": {
      const pages =
        (output.raw as { pages?: Array<{ page_index: number }> }).pages ?? [];
      return pages.map((p) => ({
        handle: buildItemHandle("page", String(p.page_index)),
        id: String(p.page_index),
        label: `Page ${p.page_index + 1}`,
        itemKind: "page" as const,
      }));
    }
    default:
      return [];
  }
}
