"use client";

import { FileText, Images, Search } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import { JsonTreeInline } from "@/components/canvas/node-detail/previews/json-tree";
import {
  ConfidenceMeter,
  CopyButton,
  CropThumb,
  PREVIEW_SCROLL,
  PreviewChip,
  PreviewEmpty,
  PreviewLabel,
  PreviewStage,
  type StageBox,
} from "@/components/canvas/nodes/preview/preview-primitives";
import { pageImageSrc, type NormalizedBBox } from "@/lib/canvas/crop-region";
import { layoutLabelColor } from "@/lib/canvas/layout-label-colors";
import {
  extractPageImage,
  extractPages,
  type PageArtifactWire,
} from "@/lib/canvas/resolve-upstream";
import type { NodeCachedOutput } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Wire shapes (loosely typed — the backend owns the schema)           */
/* ------------------------------------------------------------------ */

type RegionWire = {
  id: string;
  label?: string | null;
  docling_label?: string | null;
  provider_label?: string | null;
  bbox?: number[];
  confidence?: number | null;
};

/** Most specific label the provider gave us (Docling class > provider > generic). */
function regionLabel(region: RegionWire): string {
  return (
    region.docling_label ?? region.provider_label ?? region.label ?? "other"
  );
}

type LineWire = {
  id?: string;
  text?: string | null;
  confidence?: number | null;
  bbox?: number[];
};

type TableWire = {
  id?: string;
  rows?: number;
  cols?: number;
  html?: string;
  cells?: Array<{ row?: number; col?: number; text?: string; bbox?: number[] }>;
  bbox?: number[];
};

type FormulaWire = {
  id?: string;
  latex?: string;
  inline?: boolean;
  bbox?: number[];
};

type FigureWire = {
  id?: string;
  category?: string | null;
  caption?: string | null;
  description?: string | null;
  bbox?: number[];
};

function isBBox(value: unknown): value is NormalizedBBox {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function prettyLabel(label?: string | null): string {
  if (!label) return "region";
  // "SectionHeader" → "section header", "list_item" → "list item"
  return label
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

/** Color key: snake_case of the label so "SectionHeader" hits section_header. */
function labelColor(label: string): string {
  return layoutLabelColor(prettyLabel(label).replace(/\s+/g, "_"));
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function PagesBody({
  pages,
  selectedIndex,
  onSelectPage,
}: {
  pages: PageArtifactWire[];
  selectedIndex: number;
  onSelectPage?: (index: number) => void;
}) {
  const current =
    pages.find((entry) => entry.page_index === selectedIndex) ?? pages[0];
  if (!current) {
    return (
      <PreviewEmpty
        icon={<Images className="size-4" />}
        title="No pages yet"
        hint="Run the node to render document pages."
      />
    );
  }
  const image = current.page;
  return (
    <div className="space-y-2">
      <PreviewStage
        imageBase64={image?.image_base64}
        imageUrl={image?.image_url}
        alt={`Page ${current.page_index + 1}`}
        maxHeight={260}
        caption={
          <>
            p.{current.page_index + 1}
            {pages.length > 1 ? ` / ${pages.length}` : ""}
            {image?.width && image?.height
              ? ` · ${image.width}×${image.height}`
              : ""}
          </>
        }
      />
      {pages.length > 1 && (
        <div
          className={cn("flex gap-1.5 overflow-x-auto pb-1", PREVIEW_SCROLL)}
        >
          {pages.map((entry) => {
            const active = entry.page_index === current.page_index;
            const thumb = entry.page?.image_base64
              ? `data:image/png;base64,${entry.page.image_base64}`
              : (entry.page?.image_url ?? null);
            return (
              <button
                key={entry.page_index}
                type="button"
                aria-label={`Page ${entry.page_index + 1}`}
                aria-pressed={active}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPage?.(entry.page_index);
                }}
                className={cn(
                  "nodrag nopan relative h-14 w-11 shrink-0 overflow-hidden rounded-md border bg-muted/30 transition-[border-color,box-shadow]",
                  active
                    ? "border-[var(--pulse)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--pulse)_30%,transparent)]"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    draggable={false}
                    className="size-full object-cover object-top"
                  />
                ) : null}
                <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-card/90 px-1 font-mono text-[8px] text-foreground">
                  {entry.page_index + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Regions (layout detection)                                          */
/* ------------------------------------------------------------------ */

function RegionsBody({
  regions,
  pageImage,
}: {
  regions: RegionWire[];
  pageImage?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const region of regions) {
      const key = prettyLabel(regionLabel(region));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [regions]);

  const visible = useMemo(
    () =>
      filter
        ? regions.filter(
            (region) => prettyLabel(regionLabel(region)) === filter,
          )
        : regions,
    [regions, filter],
  );

  const boxes: StageBox[] = visible
    .filter((region) => isBBox(region.bbox))
    .map((region) => ({
      id: region.id,
      bbox: region.bbox as NormalizedBBox,
      color: labelColor(regionLabel(region)),
      tag: prettyLabel(regionLabel(region)),
    }));

  if (!regions.length) {
    return (
      <PreviewEmpty
        title="No regions detected"
        hint="Try a lower confidence threshold or a different page."
      />
    );
  }

  const LIMIT = 8;
  const list = showAll ? visible : visible.slice(0, LIMIT);

  return (
    <div className="space-y-2.5">
      <PreviewStage
        imageSrc={pageImage}
        alt="Detected layout"
        boxes={boxes}
        highlightedId={hover}
        onHoverBox={setHover}
        alwaysShowTags={boxes.length <= 12}
        maxHeight={260}
        caption={`${visible.length} of ${regions.length} region${regions.length === 1 ? "" : "s"}`}
      />

      <div className={cn("flex gap-1 overflow-x-auto pb-0.5", PREVIEW_SCROLL)}>
        <PreviewChip active={filter === null} onClick={() => setFilter(null)}>
          all · {regions.length}
        </PreviewChip>
        {counts.map(([label, count]) => (
          <PreviewChip
            key={label}
            color={labelColor(label)}
            active={filter === label}
            onClick={() => setFilter(filter === label ? null : label)}
          >
            {label} · {count}
          </PreviewChip>
        ))}
      </div>

      <ul className={cn("max-h-40 space-y-0.5", PREVIEW_SCROLL)}>
        {list.map((region, index) => {
          const color = labelColor(regionLabel(region));
          const active = hover === region.id;
          return (
            <li
              key={region.id}
              onMouseEnter={() => setHover(region.id)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1 text-[10.5px] transition-colors",
                active ? "bg-foreground/6" : "hover:bg-foreground/4",
              )}
            >
              <span
                className="font-mono text-[9px] tabular-nums text-muted-foreground"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-foreground/85">
                {prettyLabel(regionLabel(region))}
              </span>
              <ConfidenceMeter value={region.confidence ?? undefined} />
            </li>
          );
        })}
      </ul>
      {visible.length > LIMIT && (
        <button
          type="button"
          className="nodrag nopan w-full rounded-md border border-border/60 py-1 font-mono text-[9px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            setShowAll((v) => !v);
          }}
        >
          {showAll ? "Show fewer" : `Show all ${visible.length}`}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lines (text detection / recognition)                                */
/* ------------------------------------------------------------------ */

function LinesBody({
  lines,
  pageImage,
  color = "var(--node-accent)",
}: {
  lines: LineWire[];
  pageImage?: string;
  color?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const withIds = useMemo(
    () =>
      lines.map((line, index) => ({
        ...line,
        key: line.id ?? `line-${index}`,
      })),
    [lines],
  );
  const hasText = withIds.some((line) => line.text?.trim());
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withIds;
    return withIds.filter((line) => line.text?.toLowerCase().includes(q));
  }, [withIds, query]);

  const boxes: StageBox[] = filtered
    .filter((line) => isBBox(line.bbox))
    .map((line) => ({
      id: line.key,
      bbox: line.bbox as NormalizedBBox,
      color,
    }));

  if (!lines.length) {
    return (
      <PreviewEmpty
        title="No text lines"
        hint="Nothing was detected on this page."
      />
    );
  }

  const allText = withIds
    .map((line) => line.text?.trim())
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-2.5">
      <PreviewStage
        imageSrc={pageImage}
        alt={hasText ? "Recognized text" : "Detected lines"}
        boxes={boxes}
        highlightedId={hover}
        onHoverBox={setHover}
        maxHeight={220}
        caption={`${filtered.length} line${filtered.length === 1 ? "" : "s"}`}
      />

      {hasText && (
        <>
          <PreviewLabel
            trailing={<CopyButton text={allText} label="Copy text" />}
          >
            Text
          </PreviewLabel>
          {withIds.length > 8 && (
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                placeholder="Filter lines…"
                onChange={(event) => setQuery(event.target.value)}
                onPointerDown={(event) => event.stopPropagation()}
                className="nodrag nopan h-7 w-full rounded-md border border-border/60 bg-background pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--pulse)] focus-visible:outline-none"
              />
            </label>
          )}
          <ol className={cn("max-h-44 space-y-0.5", PREVIEW_SCROLL)}>
            {filtered.map((line, index) => (
              <li
                key={line.key}
                onMouseEnter={() => setHover(line.key)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px] leading-snug transition-colors",
                  hover === line.key
                    ? "bg-foreground/6"
                    : "hover:bg-foreground/4",
                )}
              >
                <span className="mt-px shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-foreground/90 select-text">
                  {line.text?.trim() || (
                    <em className="text-muted-foreground">empty</em>
                  )}
                </span>
                <ConfidenceMeter
                  value={line.confidence ?? undefined}
                  className="mt-0.5"
                />
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-1.5 py-2 text-[10.5px] text-muted-foreground">
                No lines match “{query}”.
              </li>
            )}
          </ol>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reading order                                                       */
/* ------------------------------------------------------------------ */

function ReadingOrderBody({
  regions,
  orderedIds,
  pageImage,
}: {
  regions: RegionWire[];
  orderedIds: string[];
  pageImage?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const regionMap = useMemo(
    () => new Map(regions.map((region) => [region.id, region])),
    [regions],
  );
  const ordered = orderedIds
    .map((id, index) => ({ id, index, region: regionMap.get(id) }))
    .filter((entry) => entry.region);

  if (!ordered.length) {
    return (
      <PreviewEmpty
        title="No reading order"
        hint="Run layout detection first."
      />
    );
  }

  const boxes: StageBox[] = ordered
    .filter((entry) => isBBox(entry.region?.bbox))
    .map((entry) => ({
      id: entry.id,
      bbox: entry.region!.bbox as NormalizedBBox,
      color: "var(--node-reading-order)",
      tag: String(entry.index + 1),
    }));

  return (
    <div className="space-y-2.5">
      <PreviewStage
        imageSrc={pageImage}
        alt="Reading order"
        boxes={boxes}
        highlightedId={hover}
        onHoverBox={setHover}
        alwaysShowTags
        maxHeight={260}
        caption={`${ordered.length} block${ordered.length === 1 ? "" : "s"}`}
      />
      <ol className={cn("max-h-36 space-y-0.5", PREVIEW_SCROLL)}>
        {ordered.map((entry) => (
          <li
            key={entry.id}
            onMouseEnter={() => setHover(entry.id)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-[10.5px] transition-colors",
              hover === entry.id ? "bg-foreground/6" : "hover:bg-foreground/4",
            )}
          >
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--node-reading-order)] font-mono text-[8px] text-white">
              {entry.index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground/85">
              {entry.region ? prettyLabel(regionLabel(entry.region)) : "block"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

function TablesBody({
  tables,
  pageImage,
}: {
  tables: TableWire[];
  pageImage?: string;
}) {
  const [active, setActive] = useState(0);
  if (!tables.length) {
    return (
      <PreviewEmpty title="No tables" hint="No table structure was found." />
    );
  }
  const table = tables[Math.min(active, tables.length - 1)];
  const boxes: StageBox[] = tables
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => isBBox(entry.bbox))
    .map(({ entry, index }) => ({
      id: entry.id ?? `table-${index}`,
      bbox: entry.bbox as NormalizedBBox,
      color: "var(--node-table-structure)",
      tag: `T${index + 1}`,
    }));
  const activeId = table.id ?? `table-${active}`;

  return (
    <div className="space-y-2.5">
      <PreviewStage
        imageSrc={pageImage}
        alt="Tables"
        boxes={boxes}
        highlightedId={activeId}
        onSelectBox={(id) => {
          const index = tables.findIndex(
            (entry, i) => (entry.id ?? `table-${i}`) === id,
          );
          if (index >= 0) setActive(index);
        }}
        alwaysShowTags
        maxHeight={200}
      />
      {tables.length > 1 && (
        <div className={cn("flex gap-1 overflow-x-auto", PREVIEW_SCROLL)}>
          {tables.map((entry, index) => (
            <PreviewChip
              key={entry.id ?? index}
              active={index === active}
              onClick={() => setActive(index)}
            >
              T{index + 1}
              {entry.rows !== undefined && entry.cols !== undefined
                ? ` · ${entry.rows}×${entry.cols}`
                : ""}
            </PreviewChip>
          ))}
        </div>
      )}
      <PreviewLabel
        trailing={
          table.html ? (
            <CopyButton text={table.html} label="Copy HTML" />
          ) : undefined
        }
      >
        {table.rows !== undefined && table.cols !== undefined
          ? `${table.rows} rows × ${table.cols} cols`
          : "Structure"}
      </PreviewLabel>
      {table.html ? (
        <div
          className={cn(
            "max-h-44 rounded-md border border-border/60 bg-background p-1.5 text-[10.5px]",
            "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border/60 [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-border/60 [&_th]:bg-muted/40 [&_th]:px-1.5 [&_th]:py-0.5 [&_th]:text-left [&_th]:font-semibold",
            PREVIEW_SCROLL,
          )}
          dangerouslySetInnerHTML={{ __html: table.html }}
        />
      ) : table.cells?.length ? (
        <div className={cn("max-h-40 space-y-0.5", PREVIEW_SCROLL)}>
          {table.cells.map((cell, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md bg-muted/30 px-1.5 py-1 text-[10.5px]"
            >
              <span className="font-mono text-[9px] text-muted-foreground">
                r{cell.row ?? "?"}·c{cell.col ?? "?"}
              </span>
              <span className="truncate text-foreground/90">
                {cell.text ?? "—"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10.5px] text-muted-foreground">
          Cell content not available.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulas                                                            */
/* ------------------------------------------------------------------ */

function FormulasBody({
  formulas,
  pageImage,
}: {
  formulas: FormulaWire[];
  pageImage?: string;
}) {
  if (!formulas.length) {
    return (
      <PreviewEmpty
        title="No formulas"
        hint="No math was detected on this page."
      />
    );
  }
  const boxes: StageBox[] = formulas
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => isBBox(entry.bbox))
    .map(({ entry, index }) => ({
      id: entry.id ?? `formula-${index}`,
      bbox: entry.bbox as NormalizedBBox,
      color: "var(--node-formula-detection)",
      tag: String(index + 1),
    }));
  const hasLatex = formulas.some((entry) => entry.latex);

  return (
    <div className="space-y-2.5">
      {pageImage && (
        <PreviewStage
          imageSrc={pageImage}
          alt="Formulas"
          boxes={boxes}
          alwaysShowTags
          maxHeight={180}
          caption={`${formulas.length} formula${formulas.length === 1 ? "" : "s"}`}
        />
      )}
      <ol className={cn("max-h-56 space-y-2", PREVIEW_SCROLL)}>
        {formulas.map((entry, index) => (
          <li
            key={entry.id ?? index}
            className="space-y-1.5 rounded-md border border-border/60 bg-background p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] text-muted-foreground">
                #{index + 1}
                {entry.inline ? " · inline" : ""}
              </span>
              {entry.latex && (
                <CopyButton text={entry.latex} label="Copy LaTeX" />
              )}
            </div>
            {pageImage && isBBox(entry.bbox) && (
              <CropThumb
                src={pageImage}
                bbox={entry.bbox}
                alt={`Formula ${index + 1}`}
                className="max-h-20"
              />
            )}
            {entry.latex ? (
              <code className="block overflow-x-auto rounded-sm bg-muted/40 px-2 py-1 font-mono text-[10.5px] leading-relaxed whitespace-pre text-foreground/90 select-text">
                {entry.latex}
              </code>
            ) : hasLatex ? null : (
              <p className="text-[10px] text-muted-foreground">
                Detected only — run formula recognition for LaTeX.
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

function FiguresBody({
  figures,
  pageImage,
}: {
  figures: FigureWire[];
  pageImage?: string;
}) {
  if (!figures.length) {
    return (
      <PreviewEmpty
        title="No figures"
        hint="No pictures or charts were found."
      />
    );
  }
  return (
    <div className={cn("grid max-h-72 grid-cols-2 gap-2", PREVIEW_SCROLL)}>
      {figures.map((figure, index) => {
        const text = figure.description ?? figure.caption ?? null;
        return (
          <figure
            key={figure.id ?? index}
            className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border/60 bg-background p-1.5"
          >
            {pageImage && isBBox(figure.bbox) ? (
              <CropThumb
                src={pageImage}
                bbox={figure.bbox}
                alt={figure.caption ?? `Figure ${index + 1}`}
                className="h-20 max-h-20"
              />
            ) : (
              <div className="flex h-20 items-center justify-center rounded-md bg-muted/30 text-muted-foreground">
                <Images className="size-4" />
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-mono text-[9px] text-muted-foreground">
                #{index + 1}
              </span>
              {figure.category && (
                <PreviewChip
                  color="var(--node-figure-classification)"
                  className="h-4 px-1"
                >
                  {prettyLabel(figure.category)}
                </PreviewChip>
              )}
            </div>
            {text && (
              <figcaption
                className="line-clamp-3 text-[10px] leading-snug text-foreground/80"
                title={text}
              >
                {text}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Document / text / json                                              */
/* ------------------------------------------------------------------ */

function DocumentBody({
  markdown,
  json,
  pages,
  pageCount,
}: {
  markdown?: string;
  json?: unknown;
  pages: PageArtifactWire[];
  pageCount?: number;
}) {
  type Tab = "rendered" | "markdown" | "json" | "pages";
  const tabs: Tab[] = [];
  if (markdown) tabs.push("rendered", "markdown");
  if (json !== undefined) tabs.push("json");
  if (pages.length) tabs.push("pages");
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "markdown");
  const [pageIndex, setPageIndex] = useState(0);

  if (!tabs.length) {
    return (
      <PreviewEmpty
        icon={<FileText className="size-4" />}
        title="Empty document"
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5">
          {tabs.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setTab(entry);
              }}
              className={cn(
                "nodrag nopan rounded-[5px] px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors",
                tab === entry
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">
          {pageCount !== undefined
            ? `${pageCount} page${pageCount === 1 ? "" : "s"}`
            : null}
        </span>
      </div>

      {tab === "rendered" && markdown && (
        <div
          className={cn(
            "ocrflow-preview-prose max-h-64 rounded-md border border-border/60 bg-background px-3 py-2 text-[11px] leading-relaxed text-foreground/90 select-text",
            PREVIEW_SCROLL,
          )}
        >
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      )}
      {tab === "markdown" && markdown && (
        <div className="space-y-1.5">
          <PreviewLabel
            trailing={<CopyButton text={markdown} label="Copy Markdown" />}
          >
            Source
          </PreviewLabel>
          <pre
            className={cn(
              "max-h-64 rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap text-foreground/85 select-text",
              PREVIEW_SCROLL,
            )}
          >
            {markdown}
          </pre>
        </div>
      )}
      {tab === "json" && json !== undefined && (
        <div
          className={cn(
            "max-h-64 rounded-md border border-border/60 bg-background p-2",
            PREVIEW_SCROLL,
          )}
        >
          <JsonTreeInline data={json} />
        </div>
      )}
      {tab === "pages" && (
        <PagesBody
          pages={pages}
          selectedIndex={pageIndex}
          onSelectPage={setPageIndex}
        />
      )}
    </div>
  );
}

function TextBody({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      <PreviewLabel trailing={<CopyButton text={text} label="Copy response" />}>
        Response
      </PreviewLabel>
      <div
        className={cn(
          "ocrflow-preview-prose max-h-72 rounded-md border border-border/60 bg-background px-3 py-2 text-[11.5px] leading-relaxed text-foreground/90 select-text",
          PREVIEW_SCROLL,
        )}
      >
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

function JsonBody({ value }: { value: unknown }) {
  return (
    <div className="space-y-1.5">
      <PreviewLabel
        trailing={
          <CopyButton text={JSON.stringify(value, null, 2)} label="Copy JSON" />
        }
      >
        Structured output
      </PreviewLabel>
      <div
        className={cn(
          "max-h-72 rounded-md border border-border/60 bg-background p-2",
          PREVIEW_SCROLL,
        )}
      >
        <JsonTreeInline data={value} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export type CanvasOutputPreviewProps = {
  output: NodeCachedOutput | null | undefined;
  /** Pages available for this node (own output or upstream). */
  pages?: PageArtifactWire[];
  /** Page image the boxes should be drawn over (own output or upstream). */
  pageImageBase64?: string;
  /** Alternative to base64: a URL (persisted graphs keep URLs, not blobs). */
  pageImageUrl?: string;
  selectedPageIndex?: number;
  onSelectPage?: (index: number) => void;
  /** Raw PNG returned by a run when no structured output exists. */
  fallbackPreviewBase64?: string;
  category?: string;
};

/** Output-kind aware preview body, shared by the canvas card and inspector. */
export function CanvasOutputPreview({
  output,
  pages = [],
  pageImageBase64,
  pageImageUrl,
  selectedPageIndex = 0,
  onSelectPage,
  fallbackPreviewBase64,
  category,
}: CanvasOutputPreviewProps) {
  const ownPage =
    extractPageImage(output ?? null) ?? output?.preview?.pageImage;
  const pageImage =
    (pageImageBase64 ? `data:image/png;base64,${pageImageBase64}` : null) ??
    pageImageUrl ??
    pageImageSrc(ownPage) ??
    (output?.preview?.thumbnailBase64
      ? `data:image/png;base64,${output.preview.thumbnailBase64}`
      : null) ??
    undefined;

  if (!output) {
    if (fallbackPreviewBase64) {
      return (
        <PreviewStage
          imageBase64={fallbackPreviewBase64}
          alt="Run preview"
          maxHeight={260}
        />
      );
    }
    if (pages.length) {
      return (
        <PagesBody
          pages={pages}
          selectedIndex={selectedPageIndex}
          onSelectPage={onSelectPage}
        />
      );
    }
    return null;
  }

  const raw = (output.raw ?? {}) as Record<string, unknown>;

  switch (output.kind) {
    case "pages":
    case "page": {
      const list = extractPages(output);
      return (
        <PagesBody
          pages={list.length ? list : pages}
          selectedIndex={selectedPageIndex}
          onSelectPage={onSelectPage}
        />
      );
    }
    case "regions":
      return (
        <RegionsBody
          regions={((raw.regions as RegionWire[] | undefined) ?? []).filter(
            (r) => r?.id,
          )}
          pageImage={pageImage}
        />
      );
    case "lines":
      return (
        <LinesBody
          lines={(raw.lines as LineWire[] | undefined) ?? []}
          pageImage={pageImage}
          color={
            category === "text_recognition"
              ? "var(--node-text-recognition)"
              : "var(--node-text-detection)"
          }
        />
      );
    case "reading_order":
      return (
        <ReadingOrderBody
          regions={((raw.regions as RegionWire[] | undefined) ?? []).filter(
            (r) => r?.id,
          )}
          orderedIds={
            (raw.reading_order as { ordered_ids?: string[] } | undefined)
              ?.ordered_ids ??
            (raw.ordered_ids as string[] | undefined) ??
            []
          }
          pageImage={pageImage}
        />
      );
    case "tables":
      return (
        <TablesBody
          tables={(raw.tables as TableWire[] | undefined) ?? []}
          pageImage={pageImage}
        />
      );
    case "formulas":
      return (
        <FormulasBody
          formulas={(raw.formulas as FormulaWire[] | undefined) ?? []}
          pageImage={pageImage}
        />
      );
    case "figures":
      return (
        <FiguresBody
          figures={(raw.figures as FigureWire[] | undefined) ?? []}
          pageImage={pageImage}
        />
      );
    case "document":
      return (
        <DocumentBody
          markdown={
            (raw.markdown as string | undefined) ??
            output.preview?.markdownPreview
          }
          json={raw.json ?? output.preview?.jsonPreview}
          pages={
            (raw.pages as PageArtifactWire[] | undefined) ??
            extractPages(output)
          }
          pageCount={output.preview?.itemCount ?? output.preview?.pageCount}
        />
      );
    case "text": {
      const text =
        typeof raw.text === "string" && raw.text.trim()
          ? raw.text
          : (output.preview?.textSnippets ?? []).join("\n");
      return text ? (
        <TextBody text={text} />
      ) : (
        <PreviewEmpty title="Empty response" />
      );
    }
    case "json":
      return (
        <JsonBody value={raw.data ?? output.preview?.jsonPreview ?? raw} />
      );
    default:
      return pageImage ? (
        <PreviewStage imageSrc={pageImage} alt="Preview" maxHeight={260} />
      ) : (
        <PreviewEmpty title="No preview for this output" />
      );
  }
}
