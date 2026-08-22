"use client";

import { Eye } from "lucide-react";
import { useMemo } from "react";

import { LazyBase64Image } from "@/components/canvas/lazy-base64-image";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import {
  getInlinePreviewLabel,
  summarizeInput,
  summarizeOutput,
} from "@/lib/canvas/node-preview-summary";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import {
  extractPageImage,
  extractPages,
  type PageArtifactWire,
  type UpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const WIDGET_SCROLL =
  "nowheel nodrag nopan max-h-[280px] min-h-0 overflow-y-auto overscroll-contain";

const CATEGORY_PREVIEW_HINTS: Record<string, string> = {
  page_loader: "Loaded document pages",
  preprocess: "Preprocessed page",
  layout_detection: "Detected layout regions",
  text_detection: "Detected text lines",
  text_recognition: "Recognized text",
  reading_order: "Reading order sequence",
  table_detection: "Detected tables",
  table_structure: "Table structure",
  table_cell_ocr: "Cell OCR results",
  formula_detection: "Detected formulas",
  formula_recognition: "Recognized formulas",
  figure_classification: "Classified figures",
  figure_captioning: "Figure captions",
  vlm_convert: "VLM conversion output",
  assembler: "Assembled document",
  text_generation: "Generated text",
  llm_extract: "Extracted fields",
  vision_language: "Visual understanding output",
  export: "Export preview",
};

type NodeInlinePreviewProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
  pages: PageArtifactWire[];
};

function PreviewThumbnail({ base64, alt }: { base64: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-secondary/20">
      <LazyBase64Image base64={base64} alt={alt} className="min-h-0" />
    </div>
  );
}

function TextSnippetList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1">
      {items.slice(0, 5).map((text, i) => (
        <li
          key={i}
          className="truncate rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[10px] text-foreground/80"
          title={text}
        >
          {text}
        </li>
      ))}
      {items.length > 5 && (
        <li className="px-1 font-mono text-[9px] text-muted-foreground">
          +{items.length - 5} more
        </li>
      )}
    </ul>
  );
}

function CompactPreviewBody({
  data,
  upstream,
  pages,
  mode,
  output,
}: {
  data: PipelineNodeData;
  upstream: UpstreamContext;
  pages: PageArtifactWire[];
  mode: "input" | "output";
  output: NodeCachedOutput | null;
}) {
  const selectedIndex = Number(data.params.page_index ?? 0);
  const pageImage =
    mode === "output"
      ? extractPageImage(output ?? null)?.image_base64 ??
        output?.preview?.pageImage?.image_base64 ??
        output?.preview?.thumbnailBase64
      : extractPageImage(upstream.output ?? null)?.image_base64;

  const pageList =
    mode === "output"
      ? pages.length
        ? pages
        : output
          ? extractPages(output)
          : []
      : pages.length
        ? pages
        : upstream.output
          ? extractPages(upstream.output)
          : [];

  if (mode === "output" && !output && data.runResult?.previewBase64) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:image/png;base64,${data.runResult.previewBase64}`}
        alt="Run preview"
        className="max-h-36 w-full rounded-md border border-border/60 bg-secondary/20 object-contain"
      />
    );
  }

  if (!output && !upstream.output && !pages.length) {
    const needsUpload =
      SOURCE_NODE_MODELS.has(data.modelId) ||
      data.modelId === "docling/vlm-granite-docling" ||
      data.modelId === "docling/convert-pipeline";
    const filename = data.params.assetFilename as string | undefined;

    if (filename) {
      return (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-mono text-foreground/80">{filename}</span>
          {" · "}Run this node to generate a preview.
        </p>
      );
    }

    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {needsUpload
          ? "Upload a document in Setup, then run to preview."
          : "Connect and run an upstream node to see a preview here."}
      </p>
    );
  }

  const activeOutput = output ?? upstream.output;
  const planned = isPlannedNode(data.modelId, data.category);

  if (planned && mode === "output" && !activeOutput) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Output preview will appear once this model is implemented and run.
      </p>
    );
  }

  if (
    activeOutput?.kind === "pages" ||
    activeOutput?.kind === "page" ||
    pageList.length > 0
  ) {
    const page =
      pageList.find((entry) => entry.page_index === selectedIndex) ??
      pageList[0];
    const thumb = page?.page?.image_base64 ?? pageImage;
    const pageNum = (page?.page_index ?? selectedIndex) + 1;

    return (
      <div className="space-y-2">
        {thumb && <PreviewThumbnail base64={thumb} alt={`Page ${pageNum}`} />}
        <p className="font-mono text-[10px] text-muted-foreground">
          Page {pageNum}
          {pageList.length > 1 ? ` of ${pageList.length}` : ""}
          {page?.page?.width && page?.page?.height
            ? ` · ${page.page.width}×${page.page.height}`
            : ""}
        </p>
      </div>
    );
  }

  if (activeOutput?.kind === "text") {
    return (
      <TextSnippetList items={activeOutput.preview?.textSnippets ?? []} />
    );
  }

  if (activeOutput?.kind === "lines") {
    const lines = (
      (activeOutput.raw as { lines?: Array<{ text?: string | null }> }).lines ??
      []
    );
    const fromLines = lines
      .map((line) => line.text)
      .filter((text): text is string => Boolean(text?.trim()));
    const snippets = fromLines.length
      ? fromLines
      : (activeOutput.preview?.textSnippets ?? []);

    return (
      <div className="space-y-2">
        {pageImage && <PreviewThumbnail base64={pageImage} alt="Lines preview" />}
        <TextSnippetList items={snippets} />
        {!snippets.length && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {activeOutput.preview?.itemCount ?? lines.length} line
            {(activeOutput.preview?.itemCount ?? lines.length) === 1 ? "" : "s"}
          </p>
        )}
      </div>
    );
  }

  if (activeOutput?.kind === "regions") {
    const regions = (
      (activeOutput.raw as { regions?: Array<{ label?: string | null }> })
        .regions ?? []
    );
    const labels = regions
      .map((region) => region.label)
      .filter((label): label is string => Boolean(label));

    return (
      <div className="space-y-2">
        {pageImage && (
          <PreviewThumbnail base64={pageImage} alt="Layout preview" />
        )}
        <p className="font-mono text-[10px] text-muted-foreground">
          {regions.length} region{regions.length === 1 ? "" : "s"}
          {labels.length > 0 && ` · ${labels.slice(0, 3).join(", ")}`}
        </p>
      </div>
    );
  }

  if (activeOutput?.kind === "figures") {
    const figures =
      (activeOutput.raw as {
        figures?: Array<{
          description?: string | null;
          caption?: string | null;
          category?: string | null;
        }>;
      }).figures ?? [];
    const snippets = figures.map(
      (figure) =>
        figure.description ?? figure.caption ?? figure.category ?? "Figure",
    );

    return (
      <div className="space-y-2">
        {pageImage && <PreviewThumbnail base64={pageImage} alt="Figures preview" />}
        <TextSnippetList items={snippets} />
      </div>
    );
  }

  if (activeOutput?.kind === "tables") {
    const tables =
      (activeOutput.raw as { tables?: Array<{ id: string }> }).tables ?? [];
    return (
      <div className="space-y-2">
        {pageImage && <PreviewThumbnail base64={pageImage} alt="Tables preview" />}
        <p className="font-mono text-[10px] text-muted-foreground">
          {tables.length || activeOutput.preview?.itemCount || 0} table
          {(tables.length || activeOutput.preview?.itemCount || 0) === 1
            ? ""
            : "s"}
        </p>
      </div>
    );
  }

  if (activeOutput?.kind === "document") {
    const markdown =
      (activeOutput.raw as { markdown?: string }).markdown ??
      activeOutput.preview?.markdownPreview;
    const pageCount =
      activeOutput.preview?.itemCount ?? activeOutput.preview?.pageCount ?? 0;

    return (
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted-foreground">
          Document · {pageCount} page{pageCount === 1 ? "" : "s"}
        </p>
        {markdown && (
          <p className="line-clamp-6 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/75">
            {markdown.slice(0, 400)}
            {markdown.length > 400 ? "…" : ""}
          </p>
        )}
      </div>
    );
  }

  if (
    activeOutput?.kind === "formulas" ||
    activeOutput?.kind === "reading_order"
  ) {
    const thumb = activeOutput.preview?.thumbnailBase64 ?? pageImage;
    return (
      <div className="space-y-2">
        {thumb && <PreviewThumbnail base64={thumb} alt="Preview" />}
        <p className="font-mono text-[10px] text-muted-foreground">
          {activeOutput.preview?.itemCount ?? 0} item
          {(activeOutput.preview?.itemCount ?? 0) === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  if (pageImage) {
    return <PreviewThumbnail base64={pageImage} alt="Preview" />;
  }

  if (data.category === "export") {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Exports assembled document as Markdown or JSON.
      </p>
    );
  }

  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Run this node to see output preview here.
    </p>
  );
}

function pageListLength(
  pages: PageArtifactWire[],
  output: NodeCachedOutput | null | undefined,
  upstream: UpstreamContext,
): number {
  if (pages.length) return pages.length;
  if (output) return extractPages(output).length;
  if (upstream.output) return extractPages(upstream.output).length;
  return 0;
}

export function NodeInlinePreview({
  nodeId,
  data,
  upstream,
  pages,
}: NodeInlinePreviewProps) {
  const { updateNodeConfig } = usePipelineGraphActions();

  const hasOutput = Boolean(data.cachedOutput || data.runResult?.previewBase64);
  const previewMode: "input" | "output" = hasOutput ? "output" : "input";
  const label = getInlinePreviewLabel(data, upstream);
  const inputSummary = summarizeInput(data, upstream);
  const outputSummary = summarizeOutput(data);
  const categoryHint =
    CATEGORY_PREVIEW_HINTS[data.category] ?? `${data.categoryLabel} preview`;

  const statusDot = useMemo(() => {
    if (data.runStatus === "error") return "error" as const;
    if (data.runStatus === "running") return "running" as const;
    if (hasOutput) return "success" as const;
    if (upstream.output || pages.length) return "input" as const;
    return null;
  }, [data.runStatus, hasOutput, upstream.output, pages.length]);

  const pageCount = pageListLength(pages, data.cachedOutput, upstream);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "nodrag nopan relative inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-secondary/40 hover:text-foreground data-popup-open:border-[var(--primary)]/40 data-popup-open:bg-[var(--primary)]/10 data-popup-open:text-[var(--primary)]",
        )}
        aria-label="Open preview"
      >
        <Eye className="size-3 shrink-0" strokeWidth={1.75} />
        <span>Preview</span>
        {label && (
          <span className="truncate font-mono text-[9px] text-muted-foreground data-popup-open:text-[var(--primary)]/80">
            · {label}
          </span>
        )}
        {statusDot && (
          <span
            className={cn(
              "absolute top-1 right-1 size-1.5 rounded-full",
              statusDot === "success" && "bg-[var(--status-ok)]",
              statusDot === "error" && "bg-destructive",
              statusDot === "running" && "animate-pulse bg-[var(--status-warn)]",
              statusDot === "input" && "bg-muted-foreground/50",
            )}
            aria-hidden
          />
        )}
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-[272px] p-0"
      >
        <div className="nodrag nopan border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">{data.label}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {categoryHint}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
              {previewMode === "output" ? "Output" : "Input"}
            </span>
            {(previewMode === "output" ? outputSummary : inputSummary) && (
              <span className="truncate font-mono text-[9px] text-muted-foreground">
                {previewMode === "output" ? outputSummary : inputSummary}
              </span>
            )}
          </div>
        </div>

        <div className={cn(WIDGET_SCROLL, "px-3 py-2.5")}>
          <CompactPreviewBody
            data={data}
            upstream={upstream}
            pages={pages}
            mode={previewMode}
            output={data.cachedOutput ?? null}
          />
        </div>

        {pageCount > 1 && (
          <div className="nodrag nopan flex items-center justify-center gap-2 border-t border-border/60 px-3 py-2">
            <button
              type="button"
              disabled={Number(data.params.page_index ?? 0) <= 0}
              className="rounded border border-border/60 px-2 py-0.5 font-mono text-[9px] text-muted-foreground hover:bg-secondary/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              onClick={() =>
                updateNodeConfig(nodeId, {
                  page_index: Math.max(0, Number(data.params.page_index ?? 0) - 1),
                })
              }
            >
              Prev
            </button>
            <span className="font-mono text-[9px] text-muted-foreground">
              p.{Number(data.params.page_index ?? 0) + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={Number(data.params.page_index ?? 0) >= pageCount - 1}
              className="rounded border border-border/60 px-2 py-0.5 font-mono text-[9px] text-muted-foreground hover:bg-secondary/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              onClick={() =>
                updateNodeConfig(nodeId, {
                  page_index: Math.min(
                    pageCount - 1,
                    Number(data.params.page_index ?? 0) + 1,
                  ),
                })
              }
            >
              Next
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
