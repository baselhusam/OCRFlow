"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Info } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { LazyBase64Image } from "@/components/canvas/lazy-base64-image";
import { ItemOutputHandle } from "@/components/canvas/nodes/output/item-output-handle";
import {
  RegionThumbnailPanel,
  type RegionWire,
} from "@/components/canvas/nodes/output/region-thumbnail-panel";
import { LayoutDetectionOutput } from "@/components/canvas/nodes/output/layout-detection-output";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import {
  readPageAtHintDismissed,
  writePageAtHintDismissed,
} from "@/lib/canvas/page-at-prefs";
import { isFigureCaptionTextOutput } from "@/lib/canvas/caption-branch-meta";
import { CaptionExpandPanel } from "@/components/canvas/nodes/output/caption-expand-panel";
import { CaptionTextPanel } from "@/components/canvas/nodes/output/caption-text-panel";
import {
  DocumentConverterOutputPanel,
  hasDocumentConverterOutput,
} from "@/components/canvas/nodes/output/document-converter-output-panel";
import { isPageAtAnchor } from "@/lib/canvas/page-branch-meta";
import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import { extractPageImage } from "@/lib/canvas/resolve-upstream";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";
import { cn } from "@/lib/utils";

const PAGE_BATCH = 10;

/** Scrollable output lists — scrollbar hidden, wheel/trackpad scroll still works. */
const NODE_SCROLL_AREA =
  "ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 overflow-y-auto overscroll-contain";

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

type PageThumbnailPanelProps = {
  pages: PageArtifactWire[];
  selectedIndex?: number;
  onSelectPage?: (index: number) => void;
  onOpenPage?: (index: number) => void;
  /** When true, shows connection hints and per-page output ports. */
  showConnectionPorts?: boolean;
  /** Port layout: page-at (flyout) vs page-branch (border-aligned row ports). */
  portVariant?: "page-at" | "page-branch";
  /** When true, thumbnail list fills the parent panel height. */
  fillContainer?: boolean;
  hintDismissed?: boolean;
  onDismissHint?: () => void;
  /** Page-branch: register row anchor elements for border port positioning. */
  onPortRowMount?: (pageIndex: number, element: HTMLDivElement | null) => void;
  onScrollContainerMount?: (element: HTMLDivElement | null) => void;
  onPortLayoutChange?: () => void;
};

function PageAtConnectionHint({
  dismissed,
  onDismiss,
  portVariant = "page-at",
}: {
  dismissed: boolean;
  onDismiss: () => void;
  portVariant?: "page-at" | "page-branch";
}) {
  const [hoverOpen, setHoverOpen] = useState(false);

  if (dismissed) {
    return (
      <div
        className="relative shrink-0"
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
      >
        <button
          type="button"
          className="nodrag nopan flex size-5 items-center justify-center rounded-md border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
          aria-label="Connection ports help"
        >
          <Info className="size-3" strokeWidth={2} />
        </button>
        <AnimatePresence>
          {hoverOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="ocrflow-page-at-connect-popover absolute top-full right-0 z-20 mt-1.5 w-44 space-y-1 rounded-lg border border-border/50 bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm"
            >
              <PageAtHintLines portVariant={portVariant} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="ocrflow-page-at-connect-hint mb-2 space-y-1.5 rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <p className="font-mono text-[8px] leading-snug tracking-wide text-muted-foreground/90 uppercase">
          Connect from
        </p>
        <button
          type="button"
          className="nodrag nopan rounded px-1.5 py-0.5 font-mono text-[7px] tracking-wide text-primary uppercase transition-colors hover:bg-primary/10"
          onClick={onDismiss}
        >
          Got it
        </button>
      </div>
      <PageAtHintLines portVariant={portVariant} />
    </div>
  );
}

function PageAtHintLines({
  portVariant = "page-at",
}: {
  portVariant?: "page-at" | "page-branch";
}) {
  if (portVariant === "page-branch") {
    return (
      <div className="flex items-center gap-1.5 text-[9px] text-foreground/75">
        <span className="ocrflow-port-legend-node inline-flex size-2.5 shrink-0 rounded-full" />
        <span>
          Output port → <span className="font-medium text-foreground">that page</span>
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-[9px] text-foreground/75">
        <span className="ocrflow-port-legend-node inline-flex size-2.5 shrink-0 rounded-full" />
        <span>
          Node port → <span className="font-medium text-foreground">selected page</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] text-foreground/75">
        <span className="ocrflow-port-legend-row inline-flex size-2.5 shrink-0 rounded-full" />
        <span>
          Row port → <span className="font-medium text-foreground">that page</span>
        </span>
      </div>
    </>
  );
}

function minVisibleForPage(pages: PageArtifactWire[], selectedIndex: number): number {
  const selectedPos = pages.findIndex((page) => page.page_index === selectedIndex);
  if (selectedPos < 0) return PAGE_BATCH;
  return Math.max(PAGE_BATCH, selectedPos + 1);
}

export function PageThumbnailPanel({
  pages,
  selectedIndex = 0,
  onSelectPage,
  onOpenPage,
  showConnectionPorts = false,
  portVariant = "page-at",
  fillContainer = false,
  hintDismissed = false,
  onDismissHint,
  onPortRowMount,
  onScrollContainerMount,
  onPortLayoutChange,
}: PageThumbnailPanelProps) {
  const [visibleCount, setVisibleCount] = useState(() =>
    minVisibleForPage(pages, selectedIndex),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  const visible = useMemo(
    () => pages.slice(0, visibleCount),
    [pages, visibleCount],
  );

  const isPageBranchPorts = showConnectionPorts && portVariant === "page-branch";
  const displayPages = isPageBranchPorts ? pages : visible;

  useEffect(() => {
    setVisibleCount((current) =>
      Math.max(current, minVisibleForPage(pages, selectedIndex)),
    );
  }, [pages, selectedIndex]);

  useLayoutEffect(() => {
    if (!isPageBranchPorts) return;
    onPortLayoutChange?.();
  }, [isPageBranchPorts, selectedIndex, displayPages.length, pages.length, onPortLayoutChange]);

  useEffect(() => {
    if (!isPageBranchPorts || !scrollRef.current) return;
    const scrollEl = scrollRef.current;
    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        onPortLayoutChange?.();
      });
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [isPageBranchPorts, onPortLayoutChange]);

  useLayoutEffect(() => {
    if (!showConnectionPorts || isPageBranchPorts) return;
    const row = selectedRowRef.current;
    if (!row) return;
    const raf = requestAnimationFrame(() => {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedIndex, showConnectionPorts, isPageBranchPorts, visibleCount, pages.length]);

  if (!pages.length) {
    return (
      <p className="px-2 py-3 text-center text-[10px] text-muted-foreground">
        No pages
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        fillContainer ? "h-full min-h-0" : "max-h-[320px]",
        isPageBranchPorts && "ocrflow-page-branch-thumbnails h-full min-h-0",
      )}
    >
      {showConnectionPorts && !hintDismissed && onDismissHint && !isPageBranchPorts && (
        <PageAtConnectionHint
          dismissed={false}
          onDismiss={onDismissHint}
          portVariant={portVariant}
        />
      )}
      {isPageBranchPorts ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={(el) => {
              scrollRef.current = el;
              onScrollContainerMount?.(el);
            }}
            className={cn(
              NODE_SCROLL_AREA,
              "ocrflow-page-branch-scroll flex-1 space-y-2 py-2 pl-2.5 pr-1",
            )}
          >
            {displayPages.map((artifact) => {
              const idx = artifact.page_index;
              const thumb = artifact.page?.image_base64;
              const selected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  ref={(el) => onPortRowMount?.(idx, el)}
                  className="ocrflow-page-branch-row-anchor relative flex items-stretch gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPage?.(idx);
                      onOpenPage?.(idx);
                    }}
                    className={cn(
                      "ocrflow-output-glass-card min-w-0 flex-1 overflow-hidden rounded-lg border text-left transition-all duration-200",
                      onOpenPage && "cursor-zoom-in",
                      selected
                        ? "border-[var(--node-accent)]/60 ring-1 ring-[var(--node-accent)]/35"
                        : "border-border/60 hover:border-border dark:border-white/10 dark:hover:border-white/25",
                    )}
                  >
                    {thumb ? (
                      <LazyBase64Image
                        base64={thumb}
                        alt={`Page ${idx + 1}`}
                        onLoad={onPortLayoutChange}
                      />
                    ) : (
                      <div className="flex h-16 items-center justify-center text-[10px] text-muted-foreground">
                        Page {idx + 1}
                      </div>
                    )}
                    <div className="px-2 py-1">
                      <p className="font-mono text-[9px] tracking-wide text-muted-foreground">
                        p.{idx + 1}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          {visibleCount < pages.length && !isPageBranchPorts && (
            <button
              type="button"
              className="nodrag nopan shrink-0 border-t border-border/25 px-2.5 py-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
              onClick={() => setVisibleCount((c) => c + PAGE_BATCH)}
            >
              +{Math.min(PAGE_BATCH, pages.length - visibleCount)} more
            </button>
          )}
        </div>
      ) : (
      <div
        ref={scrollRef}
        className={cn(NODE_SCROLL_AREA, "flex-1 space-y-2 px-1 py-1")}
      >
        {visible.map((artifact, i) => {
          const idx = artifact.page_index;
          const thumb = artifact.page?.image_base64;
          const selected = idx === selectedIndex;
          const isNodeOutputPage = showConnectionPorts && selected && !isPageBranchPorts;
          return (
            <motion.div
              key={idx}
              ref={isNodeOutputPage ? selectedRowRef : undefined}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className={cn("relative", "pr-6")}
            >
              {isNodeOutputPage && (
                <span
                  className="pointer-events-none absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-[var(--node-accent)]"
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => {
                  onSelectPage?.(idx);
                  onOpenPage?.(idx);
                }}
                className={cn(
                  "ocrflow-output-glass-card w-full overflow-hidden rounded-lg border text-left transition-all duration-200",
                  onOpenPage && "cursor-zoom-in",
                  selected && !isNodeOutputPage &&
                    "border-[var(--primary)]/50 ring-1 ring-[var(--primary)]/30",
                  !selected &&
                    "border-border/60 hover:border-border dark:border-white/10 dark:hover:border-white/25",
                  isNodeOutputPage &&
                    "border-[var(--node-accent)]/70 ring-2 ring-[var(--node-accent)]/40 shadow-[0_0_0_1px_color-mix(in_srgb,var(--node-accent)_20%,transparent)]",
                )}
              >
                {thumb ? (
                  <LazyBase64Image
                    base64={thumb}
                    alt={`Page ${idx + 1}`}
                  />
                ) : (
                  <div className="flex h-16 items-center justify-center text-[10px] text-muted-foreground">
                    Page {idx + 1}
                  </div>
                )}
                <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                  <p className="font-mono text-[9px] tracking-wide text-muted-foreground">
                    p.{idx + 1}
                  </p>
                  {isNodeOutputPage && (
                    <span className="rounded-sm bg-[var(--node-accent)]/15 px-1 py-px font-mono text-[7px] tracking-wide text-[var(--node-accent)] uppercase">
                      Node out
                    </span>
                  )}
                </div>
              </button>
              <div className="absolute top-1/2 right-0 flex w-6 -translate-y-1/2 items-center justify-center">
                <ItemOutputHandle
                  itemKind="page"
                  itemId={String(idx)}
                  variant={showConnectionPorts ? "page-row" : "default"}
                  className={cn(
                    selected && showConnectionPorts && "ocrflow-page-port-active",
                  )}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
      {!isPageBranchPorts && visibleCount < pages.length && (
        <button
          type="button"
          className="nodrag nopan px-2 py-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          onClick={() => setVisibleCount((c) => c + PAGE_BATCH)}
        >
          +{Math.min(PAGE_BATCH, pages.length - visibleCount)} more
        </button>
      )}
    </div>
  );
}

type OutputPanelProps = {
  nodeId: string;
  data: import("@/lib/canvas/types").PipelineNodeData;
  pages: PageArtifactWire[];
  onSelectPage?: (index: number) => void;
  compactLayoutMode?: boolean;
};

export function OutputPanel({
  nodeId,
  data,
  pages,
  onSelectPage,
  compactLayoutMode = false,
}: OutputPanelProps) {
  const { expandCaptionBranch, expandDocumentBranch, focusNode } = usePipelineGraphActions();
  const output = data.cachedOutput;
  const regions = useMemo(() => {
    if (output?.kind !== "regions") return [];
    return ((output.raw as { regions?: RegionWire[] }).regions ?? []).filter(
      (r): r is RegionWire =>
        Boolean(r?.id && Array.isArray(r.bbox) && r.bbox.length === 4),
    );
  }, [output]);
  const figures = useMemo(() => {
    if (output?.kind !== "figures") return [];
    return (
      (output.raw as { figures?: Array<{ id: string; category?: string | null; description?: string | null; caption?: string | null }> })
        .figures ?? []
    );
  }, [output]);
  const lines = useMemo(() => {
    if (output?.kind !== "lines") return [];
    return (
      (output.raw as { lines?: Array<{ id: string; text?: string | null }> }).lines ?? []
    );
  }, [output]);
  const tables = useMemo(() => {
    if (output?.kind !== "tables") return [];
    return (output.raw as { tables?: Array<{ id: string }> }).tables ?? [];
  }, [output]);
  const pageImageBase64 =
    extractPageImage(output ?? null)?.image_base64 ??
    pages[0]?.page?.image_base64;
  const pageIndex =
    (output?.raw as { page_index?: number } | undefined)?.page_index ??
    extractPageImage(output ?? null)?.page_index ??
    pages[0]?.page_index ??
    0;
  const isLayoutDetection =
    data.category === "layout_detection" &&
    output?.kind === "regions" &&
    regions.length > 0;
  const itemCount =
    output?.preview?.pageCount ??
    output?.preview?.itemCount ??
    regions.length ??
    pages.length ??
    0;

  const isPageAt = isPageAtAnchor(data.modelId);
  const isCaptionTextOutput = isFigureCaptionTextOutput(data.modelId);
  const isDocumentConverter = isDocumentConverterNode(data.modelId);
  const isDocumentOutput =
    isDocumentConverter && output?.kind === "document";

  const handleExpandCaptionBranch = () => {
    const targetId = expandCaptionBranch(nodeId);
    if (targetId) focusNode(targetId);
  };
  const handleExpandDocumentBranch = () => {
    const targetId = expandDocumentBranch(nodeId);
    if (targetId) focusNode(targetId);
  };
  const [hintDismissed, setHintDismissed] = useState(() => readPageAtHintDismissed());

  const handleDismissHint = () => {
    setHintDismissed(true);
    writePageAtHintDismissed(true);
  };

  useRefreshNodeHandles(
    true,
    output?.kind,
    regions.length,
    figures.length,
    lines.length,
    tables.length,
    pages.length,
  );

  return (
    <div
      className={cn(
        "ocrflow-pipeline-node-output nodrag nopan flex flex-col",
        isPageAt && "has-page-at-ports",
        isLayoutDetection && "has-layout-page",
        isDocumentOutput && "has-document-preview",
        output?.kind === "regions" &&
          regions.length > 0 &&
          !isLayoutDetection &&
          "has-regions",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/30 px-2 py-1.5">
        <span className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground/80 uppercase">
          Output
        </span>
        <div className="flex items-center gap-1.5">
          {itemCount > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground/70">
              {itemCount}
            </span>
          )}
          {isCaptionTextOutput && lines.length > 0 && (
            <button
              type="button"
              className="nodrag nopan flex size-5 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:border-[var(--node-figure-captioning)]/40 hover:bg-[var(--node-figure-captioning)]/10 hover:text-[var(--node-figure-captioning)]"
              aria-label={
                data.captionBranchNodeId
                  ? "Go to Caption Branch"
                  : "Expand captions to node"
              }
              title={
                data.captionBranchNodeId
                  ? "Go to Caption Branch"
                  : "Expand to node"
              }
              onClick={(event) => {
                event.stopPropagation();
                handleExpandCaptionBranch();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="size-3" strokeWidth={1.75} />
            </button>
          )}
          {isDocumentOutput && output && (
            <button
              type="button"
              className="nodrag nopan flex size-5 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:border-[var(--node-vlm-convert)]/40 hover:bg-[var(--node-vlm-convert)]/10 hover:text-[var(--node-vlm-convert)]"
              aria-label={
                data.documentBranchNodeId
                  ? "Go to Document Branch"
                  : "Expand document to node"
              }
              title={
                data.documentBranchNodeId
                  ? "Go to Document Branch"
                  : "Expand to node"
              }
              onClick={(event) => {
                event.stopPropagation();
                handleExpandDocumentBranch();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="size-3" strokeWidth={1.75} />
            </button>
          )}
          {isPageAt && hintDismissed && (
            <PageAtConnectionHint
              dismissed
              onDismiss={handleDismissHint}
            />
          )}
        </div>
      </div>

      <div className="min-h-0 max-h-[320px] flex-1 overflow-hidden px-1.5 pb-1.5 pt-1">
        {(output?.kind === "pages" || pages.length > 0) && !isCaptionTextOutput && (
          <PageThumbnailPanel
            pages={
              pages.length
                ? pages
                : ((output?.raw as { pages?: PageArtifactWire[] })?.pages ?? [])
            }
            selectedIndex={Number(data.params.page_index ?? 0)}
            onSelectPage={onSelectPage}
            showConnectionPorts={isPageAt}
            hintDismissed={hintDismissed}
            onDismissHint={handleDismissHint}
          />
        )}

        {output?.kind === "page" && pages.length === 0 && (
          <PageThumbnailPanel
            pages={[
              (output.raw as { page?: PageArtifactWire }).page as PageArtifactWire,
            ].filter(Boolean)}
            selectedIndex={0}
          />
        )}

        {isCaptionTextOutput && lines.length > 0 && (
          <CaptionTextPanel lines={lines} showConnectionPorts />
        )}

        {output?.kind === "lines" && lines.length > 0 && !isCaptionTextOutput && (
          <div className={cn(NODE_SCROLL_AREA, "max-h-[320px] space-y-1.5 px-2")}>
            {lines.map((line, i) => (
              <motion.div
                key={line.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-0.5"
              >
                <p
                  className={cn(
                    "ocrflow-output-glass-card nodrag nopan min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[10px] text-foreground/80",
                    isCaptionTextOutput
                      ? "whitespace-pre-wrap leading-relaxed"
                      : "truncate",
                  )}
                  title={line.text ?? line.id}
                >
                  {line.text ?? line.id}
                </p>
                <ItemOutputHandle itemKind="line" itemId={line.id} />
              </motion.div>
            ))}
          </div>
        )}

        {output?.kind === "figures" && figures.length > 0 && (
          <div className={cn(NODE_SCROLL_AREA, "max-h-[320px] space-y-1.5 px-2")}>
            {figures.map((figure, i) => (
              <motion.div
                key={figure.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-0.5"
              >
                <p
                  className="ocrflow-output-glass-card nodrag nopan min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-[10px] text-foreground/80"
                  title={figure.description ?? figure.caption ?? figure.category ?? figure.id}
                >
                  {figure.description ?? figure.caption ?? figure.category ?? figure.id}
                </p>
                <ItemOutputHandle itemKind="figure" itemId={figure.id} />
              </motion.div>
            ))}
          </div>
        )}

        {output?.kind === "tables" && tables.length > 0 && (
          <div className={cn(NODE_SCROLL_AREA, "max-h-[320px] space-y-1.5 px-2")}>
            {tables.map((table, i) => (
              <motion.div
                key={table.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-0.5"
              >
                <p className="ocrflow-output-glass-card nodrag nopan min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 font-mono text-[10px] text-foreground/80">
                  {table.id}
                </p>
                <ItemOutputHandle itemKind="table" itemId={table.id} />
              </motion.div>
            ))}
          </div>
        )}

        {output?.kind === "lines" && lines.length === 0 && output.preview?.textSnippets && (
          <div className={cn(NODE_SCROLL_AREA, "max-h-[320px] space-y-1.5 px-2")}>
            {output.preview.textSnippets.map((text, i) => (
              <motion.p
                key={i}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="ocrflow-output-glass-card truncate rounded-lg px-2 py-1.5 text-[10px] text-foreground/80"
                title={text}
              >
                {text}
              </motion.p>
            ))}
          </div>
        )}

        {output?.kind === "regions" && regions.length > 0 && (
          compactLayoutMode && isLayoutDetection ? (
            <RegionThumbnailPanel
              regions={regions}
              pageImageBase64={pageImageBase64}
              displayMode="compact"
              showConnectionPorts
            />
          ) : isLayoutDetection ? (
            <LayoutDetectionOutput
              regions={regions}
              pageImageBase64={pageImageBase64}
              pageIndex={pageIndex}
            />
          ) : (
            <RegionThumbnailPanel
              regions={regions}
              pageImageBase64={pageImageBase64}
            />
          )
        )}

        {output?.kind === "regions" && regions.length === 0 && (
          <p className="px-2 py-3 text-center font-mono text-[10px] text-muted-foreground">
            {output.preview?.itemCount ?? 0} item
            {(output.preview?.itemCount ?? 0) === 1 ? "" : "s"}
          </p>
        )}

        {(output?.kind === "formulas" || output?.kind === "reading_order") && (
          <div className="p-2 text-center">
            {output.preview?.thumbnailBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${output.preview.thumbnailBase64}`}
                alt="Preview"
                className="ocrflow-output-glass-card mx-auto mb-2 h-16 w-full rounded-lg object-contain"
              />
            )}
            <p className="font-mono text-[10px] text-muted-foreground">
              {output.preview?.itemCount ?? 0} item
              {(output.preview?.itemCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {output?.kind === "figures" && figures.length === 0 && (
          <div className="p-2 text-center">
            <p className="font-mono text-[10px] text-muted-foreground">
              {output.preview?.itemCount ?? 0} item
              {(output.preview?.itemCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {output?.kind === "tables" && tables.length === 0 && (
          <div className="p-2 text-center">
            <p className="font-mono text-[10px] text-muted-foreground">
              {output.preview?.itemCount ?? 0} item
              {(output.preview?.itemCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {isDocumentOutput && output && (
          <DocumentConverterOutputPanel output={output} />
        )}

        {output?.kind === "document" && !isDocumentConverter && (
          <div className="p-2 font-mono text-[10px] text-muted-foreground">
            Document · {output.preview?.itemCount ?? 0} pages
          </div>
        )}

        {!output && data.runResult?.previewBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${data.runResult.previewBase64}`}
            alt="Preview"
            className="ocrflow-output-glass-card mx-2 h-20 w-[calc(100%-1rem)] rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}

export function hasOutputData(
  data: import("@/lib/canvas/types").PipelineNodeData,
  pages: PageArtifactWire[],
): boolean {
  if (data.category === "layout_detection" && data.cachedOutput?.kind === "regions") {
    const regions =
      (data.cachedOutput.raw as { regions?: unknown[] }).regions ?? [];
    return regions.length > 0;
  }
  if (
    isFigureCaptionTextOutput(data.modelId) &&
    data.cachedOutput?.kind === "lines"
  ) {
    const lines =
      (data.cachedOutput.raw as { lines?: unknown[] }).lines ?? [];
    return lines.length > 0;
  }
  if (hasDocumentConverterOutput(data.modelId, data.cachedOutput)) {
    return true;
  }
  return (
    Boolean(data.cachedOutput) ||
    pages.length > 0 ||
    Boolean(data.runResult?.previewBase64)
  );
}
