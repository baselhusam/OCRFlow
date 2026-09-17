"use client";

import {
  Braces,
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  LayoutGrid,
  ListOrdered,
  Loader2,
  PanelRightOpen,
  Play,
  ScanText,
  Sigma,
  Table2,
  Type,
  X,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useViewport } from "@xyflow/react";

import { CanvasOutputPreview } from "@/components/canvas/nodes/preview/canvas-output-preview";
import { PreviewEmpty } from "@/components/canvas/nodes/preview/preview-primitives";
import { mappedForPage, mappedPageIndexes } from "@/lib/canvas/map-execution";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import {
  summarizeInput,
  summarizeOutput,
} from "@/lib/canvas/node-preview-summary";
import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import {
  resolveOutputPageImage,
  type PageArtifactWire,
  type UpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export const NODE_PREVIEW_CARD_WIDTH = 344;

/** Keep clear of the app header and the window edges. */
const CLAMP_TOP = 72;
const CLAMP_MARGIN = 12;

/**
 * NodeToolbar anchors the card to the node with no viewport awareness, so a
 * card next to a node near the bottom edge would run off-screen. Measure
 * after every pan/zoom and translate the card back into view. Writes the
 * transform straight to the element — no state, no extra renders.
 */
function useClampToWindow(ref: React.RefObject<HTMLDivElement | null>) {
  const viewport = useViewport();
  const offset = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const clamp = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Undo the current offset so we measure the natural anchor position.
      const top = rect.top - offset.current.y;
      const bottom = rect.bottom - offset.current.y;
      const left = rect.left - offset.current.x;
      const right = rect.right - offset.current.x;
      const maxBottom = window.innerHeight - CLAMP_MARGIN;
      const maxRight = window.innerWidth - CLAMP_MARGIN;

      let y = 0;
      if (bottom > maxBottom) y = maxBottom - bottom;
      if (top + y < CLAMP_TOP) y = CLAMP_TOP - top;
      let x = 0;
      if (right > maxRight) x = maxRight - right;
      if (left + x < CLAMP_MARGIN) x = CLAMP_MARGIN - left;

      if (x !== offset.current.x || y !== offset.current.y) {
        offset.current = { x, y };
        el.style.transform = x || y ? `translate(${x}px, ${y}px)` : "";
      }
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [ref, viewport.x, viewport.y, viewport.zoom]);
}

const KIND_ICON: Record<NodeCachedOutput["kind"], typeof Images> = {
  pages: Images,
  page: Images,
  regions: LayoutGrid,
  lines: ScanText,
  reading_order: ListOrdered,
  tables: Table2,
  formulas: Sigma,
  figures: Images,
  document: FileText,
  text: Type,
  json: Braces,
};

type NodePreviewCardProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
  pages: PageArtifactWire[];
  onClose: () => void;
  /** Replace the generic body (defaults to CanvasOutputPreview). */
  children?: ReactNode;
  /** Extra footer content (branch expand / item-port controls on anchor nodes). */
  footer?: ReactNode;
  /** Offer a "Run node" button while showing input (false for selectors with nothing to run). */
  showRun?: boolean;
};

/**
 * Floating preview card anchored to the right of a node. It is rendered
 * through React Flow's NodeToolbar portal, so it keeps screen scale at any
 * canvas zoom — nothing inside it may rely on being in the node's DOM.
 */
export function NodePreviewCard({
  nodeId,
  data,
  upstream,
  pages,
  onClose,
  children,
  footer,
  showRun = true,
}: NodePreviewCardProps) {
  const { selectNode, updateNodeConfig, runNode, nodes, edges, projectId } =
    usePipelineGraphActions();

  const fullOutput = data.cachedOutput ?? null;
  const hasOutput = Boolean(fullOutput || data.runResult?.previewBase64);
  const mode: "output" | "input" = hasOutput ? "output" : "input";
  const running = data.runStatus === "running";

  // Mapped outputs ("Apply to all pages") get their own page switcher; the
  // page shown defaults to the node's current page.
  const mappedPages = mappedPageIndexes(fullOutput);
  const isMapped = mappedPages.length > 0;
  const currentPage =
    (fullOutput?.raw as { page_index?: number } | null)?.page_index ??
    Number(data.params.page_index ?? mappedPages[0] ?? 0);
  const [viewPage, setViewPage] = useState<number | null>(null);
  const shownPage = viewPage ?? currentPage;
  const output = isMapped
    ? (mappedForPage(fullOutput, shownPage) ?? fullOutput)
    : fullOutput;
  const mappedError = fullOutput?.mapped?.find((entry) => entry.page_index === shownPage)?.error;

  const Icon = output ? (KIND_ICON[output.kind] ?? Images) : Images;
  const summary = hasOutput
    ? summarizeOutput({ ...data, cachedOutput: output })
    : summarizeInput(data, upstream);

  // Boxes for regions/lines/etc. need the pixel page — walk upstream when the
  // node's own output only carries geometry.
  const upstreamPage = resolveOutputPageImage(
    nodeId,
    output ?? upstream.output ?? null,
    nodes,
    edges,
  );

  const selectedPageIndex = Number(data.params.page_index ?? 0);
  const hasPageParam = "page_index" in data.params;
  const showPageNav = !isMapped && hasPageParam && pages.length > 1;
  const mappedPos = Math.max(0, mappedPages.indexOf(shownPage));

  const readiness = getNodeTestRunReadiness(nodeId, nodes, edges, projectId);
  const cardRef = useRef<HTMLDivElement>(null);
  useClampToWindow(cardRef);

  return (
    <div
      ref={cardRef}
      className="ocrflow-node-preview-card flex max-h-[calc(100vh-96px)] flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left shadow-[0_18px_40px_-16px_color-mix(in_srgb,var(--foreground)_28%,transparent),0_0_0_1px_color-mix(in_srgb,var(--node-accent)_18%,transparent)]"
      style={{ width: NODE_PREVIEW_CARD_WIDTH }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: "var(--node-accent)" }}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[11px] font-semibold text-foreground">
            {mode === "output" ? "Output" : "Input"}
            {summary && (
              <span className="ml-1.5 font-mono text-[9.5px] font-normal text-muted-foreground">
                {summary}
              </span>
            )}
          </p>
          <p className="truncate font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
            {data.label}
          </p>
        </div>

        {isMapped && mappedPages.length > 1 && (
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--node-accent)]/40 bg-[var(--node-accent)]/8 px-0.5"
            title="Results for every page — switch pages here"
          >
            <button
              type="button"
              aria-label="Previous page result"
              disabled={mappedPos <= 0}
              className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-35"
              onClick={() => setViewPage(mappedPages[Math.max(0, mappedPos - 1)])}
            >
              <ChevronLeft className="size-3" />
            </button>
            <span className="min-w-[44px] text-center font-mono text-[9px] tabular-nums text-foreground">
              p.{shownPage + 1}
              <span className="text-muted-foreground"> / {mappedPages.length}</span>
            </span>
            <button
              type="button"
              aria-label="Next page result"
              disabled={mappedPos >= mappedPages.length - 1}
              className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-35"
              onClick={() =>
                setViewPage(mappedPages[Math.min(mappedPages.length - 1, mappedPos + 1)])
              }
            >
              <ChevronRight className="size-3" />
            </button>
          </div>
        )}

        {showPageNav && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/60 bg-background px-0.5">
            <button
              type="button"
              aria-label="Previous page"
              disabled={selectedPageIndex <= 0}
              className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-35"
              onClick={() =>
                updateNodeConfig(nodeId, {
                  page_index: Math.max(0, selectedPageIndex - 1),
                })
              }
            >
              <ChevronLeft className="size-3" />
            </button>
            <span className="min-w-[38px] text-center font-mono text-[9px] tabular-nums text-foreground">
              {selectedPageIndex + 1}/{pages.length}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={selectedPageIndex >= pages.length - 1}
              className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-35"
              onClick={() =>
                updateNodeConfig(nodeId, {
                  page_index: Math.min(pages.length - 1, selectedPageIndex + 1),
                })
              }
            >
              <ChevronRight className="size-3" />
            </button>
          </div>
        )}

        <button
          type="button"
          aria-label="Open details panel"
          title="Open details panel"
          className="nodrag nopan flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          onClick={() => selectNode(nodeId)}
        >
          <PanelRightOpen className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Close preview"
          className="nodrag nopan flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Body — capped so tall outputs scroll inside the card. */}
      <div className="ocrflow-node-output-scroll nowheel min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {data.runResult?.error && (
          <NodeErrorPanel
            compact
            error={data.runResult.error}
            errorCode={data.runResult.errorCode}
            errorContext={data.runResult.errorContext}
            nodeLabel={data.label}
            className="mb-2.5"
          />
        )}

        {mappedError && (
          <p className="mb-2.5 rounded-md border border-destructive/30 bg-destructive/6 px-2 py-1.5 text-[10.5px] text-destructive">
            Page {shownPage + 1} failed: {mappedError}
          </p>
        )}

        {children ?? (
          <>
            {mode === "output" ? (
              <CanvasOutputPreview
                key={isMapped ? shownPage : "single"}
                output={output}
                pages={pages}
                pageImageBase64={upstreamPage?.image_base64}
                pageImageUrl={upstreamPage?.image_url}
                selectedPageIndex={selectedPageIndex}
                onSelectPage={(index) =>
                  updateNodeConfig(nodeId, { page_index: index })
                }
                fallbackPreviewBase64={data.runResult?.previewBase64}
                category={data.category}
              />
            ) : upstream.output || pages.length ? (
              <div className="space-y-2.5">
                <CanvasOutputPreview
                  output={upstream.output}
                  pages={pages}
                  pageImageBase64={upstreamPage?.image_base64}
                  pageImageUrl={upstreamPage?.image_url}
                  selectedPageIndex={selectedPageIndex}
                  onSelectPage={(index) =>
                    updateNodeConfig(nodeId, { page_index: index })
                  }
                  category={data.category}
                />
                <p className="text-center text-[10.5px] text-muted-foreground">
                  Showing the input this node will receive. Run it to see its
                  output here.
                </p>
              </div>
            ) : (
              <PreviewEmpty
                title="Nothing to preview yet"
                hint={
                  readiness.ready
                    ? "Run this node to generate an output."
                    : (readiness.issues[0] ?? "Connect an upstream node first.")
                }
              />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {(footer || (mode === "input" && showRun)) && (
        <div className="border-t border-border/60 px-3 py-2">
          {footer}
          {mode === "input" && !footer && showRun && (
            <button
              type="button"
              disabled={!readiness.ready || running}
              className={cn(
                "nodrag nopan flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={() => void runNode(nodeId)}
            >
              {running ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Play className="size-3" />
              )}
              {running ? "Running…" : "Run node"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
