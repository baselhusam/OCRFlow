"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  X,
} from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";

import {
  BranchPanelResizeHandle,
  useBranchPanelResize,
  type BranchPanelSize,
} from "@/components/canvas/nodes/branch-panel-resize";
import { ItemOutputHandle } from "@/components/canvas/nodes/output/item-output-handle";
import {
  PipelineNodeHeader,
  type PipelineNodeVisualState,
} from "@/components/canvas/nodes/pipeline-node-header";
import {
  ConfidenceMeter,
  CropThumb,
  PreviewChip,
} from "@/components/canvas/nodes/preview/preview-primitives";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useItemPortOffsets } from "@/hooks/use-item-port-offsets";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import { pageImageSrc } from "@/lib/canvas/crop-region";
import { layoutLabelColor } from "@/lib/canvas/layout-label-colors";
import {
  getNodeReadiness,
  getUpstreamPagesForNode,
} from "@/lib/canvas/node-readiness";
import { mappedForPage, mappedPageIndexes } from "@/lib/canvas/map-execution";
import {
  buildGroupHandle,
  buildItemHandle,
  listCollectionItems,
  type CollectionItem,
  type ItemKind,
} from "@/lib/canvas/output-slice";
import {
  isPageBranchNode,
  PAGE_BRANCH_PANEL_DEFAULT,
  PAGE_BRANCH_PANEL_MAX,
  PAGE_BRANCH_PANEL_MIN,
} from "@/lib/canvas/page-branch-meta";
import { isRegionBranchNode } from "@/lib/canvas/region-branch-meta";
import {
  buildPagesOutput,
  resolveOutputPageImage,
  upstreamSatisfiesInput,
} from "@/lib/canvas/resolve-upstream";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { getModelWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";

/** Persisted under node params so a group wire survives reloads. */
const SELECTED_ITEMS_PARAM = "selected_items";
const GROUP_ROW_KEY = "__group__";

// Stable bounds: useBranchPanelResize keys its callbacks on these objects.
const PANEL_MIN = { width: 220, height: PAGE_BRANCH_PANEL_MIN.height };
const PANEL_MAX = PAGE_BRANCH_PANEL_MAX;
const PANEL_DEFAULT = { width: 264, height: PAGE_BRANCH_PANEL_DEFAULT.height };

const KIND_LABEL: Record<ItemKind, { one: string; many: string }> = {
  page: { one: "page", many: "pages" },
  region: { one: "region", many: "regions" },
  line: { one: "line", many: "lines" },
  table: { one: "table", many: "tables" },
  figure: { one: "figure", many: "figures" },
  formula: { one: "formula", many: "formulas" },
};

function getVisualState(
  runStatus: PipelineNodeData["runStatus"],
  isSelected: boolean,
): PipelineNodeVisualState {
  if (runStatus === "error") return "error";
  if (runStatus === "running") return "running";
  if (isSelected) return "selected";
  return "idle";
}

function shellClassName(visualState: PipelineNodeVisualState): string {
  return cn(
    "ocrflow-page-at-output-card ocrflow-collection-items-panel relative flex flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-150",
    visualState === "idle" &&
      "border-border/60 shadow-sm group-hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--foreground)_5%,transparent)]",
    (visualState === "selected" || visualState === "running") &&
      "border-[var(--pulse)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--pulse)_34%,transparent),0_0_28px_-4px_color-mix(in_srgb,var(--pulse)_26%,transparent),0_12px_32px_-12px_color-mix(in_srgb,var(--foreground)_14%,transparent)]",
    visualState === "error" &&
      "border-destructive shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_32%,transparent)]",
  );
}

function parseSelected(value: unknown): string[] {
  return typeof value === "string" && value
    ? value.split(",").filter(Boolean)
    : [];
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

type RowProps = {
  item: CollectionItem;
  pageImage?: string;
  isMain: boolean;
  isChecked: boolean;
  isWired: boolean;
  onToggle: () => void;
  onMakeMain?: () => void;
  register: (key: string, el: HTMLElement | null) => void;
};

function ItemRow({
  item,
  pageImage,
  isMain,
  isChecked,
  isWired,
  onToggle,
  onMakeMain,
  register,
}: RowProps) {
  const color =
    item.itemKind === "region"
      ? layoutLabelColor(item.label.replace(/\s+/g, "_"))
      : undefined;
  const thumbSrc = item.image?.base64
    ? `data:image/png;base64,${item.image.base64}`
    : (item.image?.url ?? null);

  return (
    <div
      ref={(el) => register(item.handle, el)}
      className={cn(
        "group/row relative flex items-center gap-2 rounded-md border px-1.5 py-1.5 transition-colors",
        isMain
          ? "border-[var(--node-accent)]/45 bg-[var(--node-accent)]/6"
          : isChecked
            ? "border-[var(--pulse)]/40 bg-[var(--pulse)]/6"
            : "border-transparent hover:bg-foreground/4",
      )}
      onClick={onMakeMain}
      role={onMakeMain ? "button" : undefined}
    >
      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        aria-label={`Select ${item.label}`}
        className={cn(
          "nodrag nopan flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
          isChecked
            ? "border-[var(--pulse)] bg-[var(--pulse)] text-white"
            : "border-border bg-background text-transparent opacity-0 group-hover/row:opacity-100 hover:border-foreground/40",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>

      {/* Thumbnail */}
      {item.itemKind === "page" ? (
        <div className="h-14 w-11 shrink-0 overflow-hidden rounded border border-border/60 bg-muted/30">
          {thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt=""
              draggable={false}
              className="size-full object-cover object-top"
            />
          ) : null}
        </div>
      ) : item.itemKind === "line" ? null : pageImage && item.bbox ? (
        <CropThumb
          src={pageImage}
          bbox={item.bbox}
          alt={item.label}
          maxWidth={160}
          className="h-11 w-16 shrink-0 object-cover"
        />
      ) : (
        <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-muted/30 text-muted-foreground">
          <Layers className="size-3.5" />
        </div>
      )}

      {/* Text */}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1.5">
          {color && (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
          <p
            className={cn(
              "truncate text-[11px] font-medium text-foreground",
              item.itemKind === "line" &&
                "line-clamp-2 whitespace-normal font-normal",
            )}
            title={item.text ?? item.label}
          >
            {item.label}
          </p>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {item.sublabel && (
            <span className="truncate font-mono text-[9px] text-muted-foreground">
              {item.sublabel}
            </span>
          )}
          <ConfidenceMeter value={item.confidence} />
          {isMain && (
            <span className="rounded-sm bg-[var(--node-accent)]/15 px-1 font-mono text-[8px] tracking-wide text-[var(--node-accent)] uppercase">
              main
            </span>
          )}
        </div>
      </div>

      {/* Wired dot */}
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors",
          isWired ? "bg-[var(--node-accent)]" : "bg-transparent",
        )}
        title={isWired ? "Connected downstream" : undefined}
        aria-hidden
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Node                                                                */
/* ------------------------------------------------------------------ */

/**
 * Universal fan-out node: shows every item of an upstream collection
 * (pages, regions, lines, tables, figures, formulas) with one output port
 * per item, plus a group port for any multi-selection. Replaces the
 * per-kind branch nodes; the persisted model ids stay for compatibility.
 */
function CollectionItemsNodeComponent(props: NodeProps) {
  const { id, data, selected } = props;
  const nodeData = data as PipelineNodeData;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  const {
    projectId,
    getUpstream,
    updateNodeConfig,
    updateNodeData,
    closePageBranch,
    closeRegionBranch,
    edges,
    nodes,
    focusPulseNodeId,
    selectedNodeId,
  } = usePipelineGraphActions();

  const isPage = isPageBranchNode(nodeData.modelId);
  const isRegion = isRegionBranchNode(nodeData.modelId);
  const isSelected = selected || selectedNodeId === id;
  const visualState = getVisualState(nodeData.runStatus, isSelected);

  const requiredInput = getModelWireKinds(
    nodeData.modelId,
    nodeData.inputType,
    nodeData.outputType,
  ).input;
  const upstream = getUpstream(id, requiredInput);

  // The collection this node fans out: pages come from the Select Page
  // anchor's upstream; everything else is the anchor's own output.
  const base: NodeCachedOutput | null = useMemo(() => {
    if (isPage) {
      const pages = getUpstreamPagesForNode(nodeData, upstream);
      return pages.length ? buildPagesOutput(pages) : null;
    }
    return upstream.rawOutput ?? upstream.output ?? null;
  }, [isPage, nodeData, upstream]);

  // An anchor applied to all pages: browse its items page by page, and
  // qualify every handle with the page so wires stay unambiguous.
  const mappedPages = useMemo(() => mappedPageIndexes(base), [base]);
  const isMapped = mappedPages.length > 0;
  const [viewPage, setViewPage] = useState<number | null>(null);
  const shownPage =
    viewPage ??
    (base?.raw as { page_index?: number } | null)?.page_index ??
    mappedPages[0] ??
    0;
  const mappedPos = Math.max(0, mappedPages.indexOf(shownPage));
  const source = useMemo(
    () => (isMapped ? (mappedForPage(base, shownPage) ?? base) : base),
    [base, isMapped, shownPage],
  );

  const items = useMemo(() => {
    const list = listCollectionItems(source);
    if (!isMapped) return list;
    return list.map((item) => ({
      ...item,
      pageIndex: shownPage,
      handle: buildItemHandle(item.itemKind, item.id, shownPage),
    }));
  }, [isMapped, shownPage, source]);
  const kind: ItemKind | null = items[0]?.itemKind ?? null;
  const pageImage =
    kind && kind !== "page"
      ? (pageImageSrc(resolveOutputPageImage(id, source, nodes, edges)) ??
        undefined)
      : undefined;

  const labelCounts = useMemo(() => {
    if (kind !== "region" && kind !== "figure")
      return [] as Array<[string, number]>;
    const map = new Map<string, number>();
    for (const item of items)
      map.set(item.label, (map.get(item.label) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, kind]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (labelFilter && item.label !== labelFilter) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q) ||
        item.text?.toLowerCase().includes(q)
      );
    });
  }, [items, query, labelFilter]);

  // Which handles already carry a wire.
  const wiredHandles = useMemo(() => {
    const set = new Set<string>();
    for (const edge of edges) {
      if (edge.source === id && edge.sourceHandle) set.add(edge.sourceHandle);
    }
    return set;
  }, [edges, id]);

  // Selection (group port).
  const selectedIds = useMemo(
    () => parseSelected(nodeData.params[SELECTED_ITEMS_PARAM]),
    [nodeData.params],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const validSelectedIds = useMemo(() => {
    const known = new Set(items.map((item) => item.id));
    return selectedIds.filter((entry) => known.has(entry));
  }, [items, selectedIds]);
  const groupHandle =
    kind && validSelectedIds.length > 1
      ? buildGroupHandle(kind, validSelectedIds)
      : null;

  const setSelected = useCallback(
    (ids: string[]) =>
      updateNodeConfig(id, { [SELECTED_ITEMS_PARAM]: ids.join(",") }),
    [id, updateNodeConfig],
  );
  const toggleItem = (itemId: string) =>
    setSelected(
      selectedSet.has(itemId)
        ? selectedIds.filter((entry) => entry !== itemId)
        : [...selectedIds, itemId],
    );

  // Page branches keep the Select Page semantics on the main port.
  const mainPageIndex = Number(nodeData.params.page_index ?? 0);

  // Panel size.
  const handleResizeEnd = useCallback(
    (next: BranchPanelSize) =>
      updateNodeData(
        id,
        { branchPanelWidth: next.width, branchPanelHeight: next.height },
        true,
      ),
    [id, updateNodeData],
  );
  const {
    panelRef,
    panelSize: { width: panelWidth, height: panelHeight },
    isResizing,
    handleResizePointerDown,
  } = useBranchPanelResize({
    width: nodeData.branchPanelWidth ?? PANEL_DEFAULT.width,
    height: nodeData.branchPanelHeight ?? PANEL_DEFAULT.height,
    min: PANEL_MIN,
    max: PANEL_MAX,
    onResizeEnd: handleResizeEnd,
  });

  // Ports aligned to rows.
  const { offsets, registerRow, registerScrollContainer, onScroll } =
    useItemPortOffsets(id, nodeRef, [
      visible.length,
      panelWidth,
      panelHeight,
      groupHandle,
      query,
      labelFilter,
    ]);

  useRefreshNodeHandles(
    visible.length,
    panelWidth,
    panelHeight,
    groupHandle,
    nodeData.runStatus,
    Object.keys(offsets).length,
  );

  let inputStatus: "ok" | "warn" | "error" = "ok";
  if (!upstream.output) inputStatus = "warn";
  else if (!upstreamSatisfiesInput(requiredInput, upstream.output))
    inputStatus = "error";
  else if (
    !getNodeReadiness(nodeData.modelId, nodeData, upstream, projectId).ready
  ) {
    inputStatus = "warn";
  }

  const close = () => {
    if (isPage) closePageBranch(id);
    else if (isRegion) closeRegionBranch(id);
  };

  const kindLabel = kind ? KIND_LABEL[kind] : { one: "item", many: "items" };
  const headerLabel = kind
    ? `${items.length} ${items.length === 1 ? kindLabel.one : kindLabel.many}`
    : nodeData.categoryLabel;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "ocrflow-pipeline-node group relative overflow-visible",
        isSelected && "selected",
        focusPulseNodeId === id && "focus-pulse",
      )}
      data-category={nodeData.category}
    >
      <div
        ref={panelRef}
        className={cn(shellClassName(visualState), isResizing && "select-none")}
        style={{ width: panelWidth, height: panelHeight }}
      >
        <PipelineNodeHeader
          data={{ ...nodeData, label: "Items", categoryLabel: headerLabel }}
          visualState={visualState}
          actions={
            <button
              type="button"
              className="nodrag nopan flex size-6 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Close items"
              title="Close"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                close();
              }}
            >
              <X className="size-3.5" strokeWidth={1.8} />
            </button>
          }
        />

        {/* Toolbar */}
        {(items.length > 0 || isMapped) && (
          <div className="flex flex-col gap-1.5 border-b border-border/50 px-2 py-1.5">
            {isMapped && (
              <div className="flex items-center justify-between gap-1 rounded-md border border-[var(--node-accent)]/40 bg-[var(--node-accent)]/8 px-1 py-0.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={mappedPos <= 0}
                  className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-35"
                  onClick={(event) => {
                    event.stopPropagation();
                    setViewPage(mappedPages[Math.max(0, mappedPos - 1)]);
                  }}
                >
                  <ChevronLeft className="size-3" />
                </button>
                <span className="font-mono text-[9.5px] tabular-nums text-foreground">
                  p.{shownPage + 1}
                  <span className="text-muted-foreground">
                    {" "}
                    / {mappedPages.length}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={mappedPos >= mappedPages.length - 1}
                  className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-35"
                  onClick={(event) => {
                    event.stopPropagation();
                    setViewPage(
                      mappedPages[
                        Math.min(mappedPages.length - 1, mappedPos + 1)
                      ],
                    );
                  }}
                >
                  <ChevronRight className="size-3" />
                </button>
              </div>
            )}
            {items.length > 6 && (
              <label className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  placeholder={`Filter ${kindLabel.many}…`}
                  onChange={(event) => setQuery(event.target.value)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="nodrag nopan h-6 w-full rounded-md border border-border/60 bg-background pr-2 pl-6 text-[10.5px] text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--pulse)] focus-visible:outline-none"
                />
              </label>
            )}
            {labelCounts.length > 1 && (
              <div className="ocrflow-node-output-scroll nowheel flex gap-1 overflow-x-auto">
                <PreviewChip
                  active={labelFilter === null}
                  onClick={() => setLabelFilter(null)}
                >
                  all
                </PreviewChip>
                {labelCounts.map(([label, count]) => (
                  <PreviewChip
                    key={label}
                    color={layoutLabelColor(label.replace(/\s+/g, "_"))}
                    active={labelFilter === label}
                    onClick={() =>
                      setLabelFilter(labelFilter === label ? null : label)
                    }
                  >
                    {label} · {count}
                  </PreviewChip>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rows */}
        <div
          ref={registerScrollContainer}
          onScroll={onScroll}
          className="ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-1.5 py-1.5"
        >
          {items.length === 0 ? (
            <p className="flex h-full items-center justify-center px-3 text-center text-[10.5px] text-muted-foreground">
              {isPage
                ? "Connect to Select Page and load a document."
                : "Run the upstream node to list its items here."}
            </p>
          ) : visible.length === 0 ? (
            <p className="px-2 py-3 text-center text-[10.5px] text-muted-foreground">
              No {kindLabel.many} match.
            </p>
          ) : (
            visible.map((item) => (
              <ItemRow
                key={item.handle}
                item={item}
                pageImage={pageImage}
                isMain={isPage && item.pageIndex === mainPageIndex}
                isChecked={selectedSet.has(item.id)}
                isWired={wiredHandles.has(item.handle)}
                onToggle={() => toggleItem(item.id)}
                onMakeMain={
                  isPage && item.pageIndex !== undefined
                    ? () =>
                        updateNodeConfig(id, { page_index: item.pageIndex! })
                    : undefined
                }
                register={registerRow}
              />
            ))
          )}
        </div>

        {/* Selection footer → group port */}
        {validSelectedIds.length > 0 && (
          <div
            ref={(el) => registerRow(GROUP_ROW_KEY, el)}
            className="flex items-center gap-2 border-t border-border/50 bg-[var(--pulse)]/6 px-2 py-1.5"
          >
            <span className="flex size-4 items-center justify-center rounded bg-[var(--pulse)] text-white">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
              {validSelectedIds.length} selected
              {groupHandle ? (
                <span className="ml-1 font-mono text-[9px] font-normal text-muted-foreground">
                  · one wire
                </span>
              ) : (
                <span className="ml-1 font-mono text-[9px] font-normal text-muted-foreground">
                  · pick one more to group
                </span>
              )}
            </span>
            <button
              type="button"
              className="nodrag nopan font-mono text-[9px] tracking-wide text-muted-foreground uppercase hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                setSelected([]);
              }}
            >
              Clear
            </button>
          </div>
        )}

        <BranchPanelResizeHandle onPointerDown={handleResizePointerDown} />
      </div>

      {/* Per-item ports on the node border */}
      {visible.map((item) => {
        const top = offsets[item.handle];
        if (top === undefined) return null;
        return (
          <div
            key={item.handle}
            className="ocrflow-page-branch-port absolute top-0 -right-1.5 z-10 -translate-y-1/2"
            style={{ top }}
          >
            <ItemOutputHandle
              itemKind={item.itemKind}
              itemId={item.id}
              variant="node-border"
            />
          </div>
        );
      })}

      {/* Group port */}
      {groupHandle && offsets[GROUP_ROW_KEY] !== undefined && (
        <div
          className="ocrflow-page-branch-port absolute top-0 -right-1.5 z-10 -translate-y-1/2"
          style={{ top: offsets[GROUP_ROW_KEY] }}
        >
          <Handle
            type="source"
            position={Position.Right}
            id={groupHandle}
            isConnectable
            isConnectableStart
            className="ocrflow-node-border-output-handle !relative !top-0 !right-0 !h-3.5 !w-3.5 !transform-none !border-2 !bg-[var(--pulse)]"
            style={{ borderColor: "var(--card)" }}
            title={`Connect the ${validSelectedIds.length} selected ${kindLabel.many} as one input`}
            aria-label={`Connect ${validSelectedIds.length} selected ${kindLabel.many}`}
          />
        </div>
      )}

      {/* Input */}
      <div className="absolute top-1/2 -left-1.5 z-10 -translate-y-1/2">
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          isConnectable
          isConnectableEnd
          className="!relative !top-0 !left-0 !h-3 !w-3 !transform-none !border-2 !bg-card"
          style={{ borderColor: "var(--node-accent)" }}
          aria-label={`Input: ${formatWireLabel(nodeData.inputType)}`}
        />
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -left-3 size-1.5 -translate-y-1/2 rounded-full",
            inputStatus === "ok" && "bg-[var(--status-ok)]",
            inputStatus === "warn" && "bg-[var(--status-warn)]",
            inputStatus === "error" && "bg-destructive",
          )}
        />
      </div>
    </div>
  );
}

export const CollectionItemsNode = memo(CollectionItemsNodeComponent);
