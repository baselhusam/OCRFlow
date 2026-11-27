"use client";

import { NodeToolbar, Position, type NodeProps } from "@xyflow/react";
import {
  Copy,
  Eye,
  FileUp,
  Layers,
  Split,
  Info,
  Loader2,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { EngineMark } from "@/components/flow-editor/library/engine-mark";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import {
  clearHoveredToolbarNode,
  setHoveredToolbarNode,
  useEditorUi,
  useOtherNodeHovered,
} from "@/components/flow-editor/editor-ui-context";
import { getFanOut, mapPageCount } from "@/components/flow-editor/node-capabilities";
import { NodePin } from "@/components/flow-editor/nodes/node-pin";
import { QuickSettings } from "@/components/flow-editor/nodes/quick-settings";
import {
  getNodeStatus,
  TONE_STYLES,
  type NodeStatus,
} from "@/components/flow-editor/node-status";
import { ToolButton } from "@/components/flow-editor/tool-button";
import { useDocumentUpload } from "@/components/flow-editor/use-document-upload";
import { wireColor, wireKindLabel } from "@/components/flow-editor/wire-colors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCategoryDescription, SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { isCustomPipelineNodeData } from "@/lib/canvas/custom-pipeline-node-data";
import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import { getQuickParamSchema } from "@/components/flow-editor/nodes/quick-param-schema";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { getNodeWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";

export const FLOW_NODE_WIDTH = 272;
export const FLOW_NODE_HEIGHT = 104;

function useElapsed(running: boolean) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) {
      setStartedAt(null);
      return;
    }
    setStartedAt(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);
  return startedAt ? now - startedAt : null;
}

function FlowNodeComponent({ id, data: rawData, selected }: NodeProps) {
  const data = rawData as PipelineNodeData;
  const graph = usePipelineGraphActions();
  const ui = useEditorUi();
  const { getModelStatus } = useRuntimeAvailability();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const hoverTimer = useRef<number | null>(null);

  const isSource = SOURCE_NODE_MODELS.has(data.modelId);
  const isCustom = isCustomPipelineNodeData(data);
  const kinds = getNodeWireKinds(data);
  const upload = useDocumentUpload(id, data);

  const entry = graph.modelCatalog.find((model) => model.id === data.modelId);
  const offline = entry ? getModelStatus(entry).offline : false;
  const fullRunState = ui.fullRunNodeStates.get(id);
  const running = data.runStatus === "running" || fullRunState === "running";
  const elapsed = useElapsed(running);

  // Chain-aware: a node is only "Ready" if everything upstream can run too.
  const readiness = useMemo(
    () => (isSource ? null : getNodeTestRunReadiness(id, graph.nodes, graph.edges, graph.projectId)),
    [graph.nodes, graph.edges, graph.projectId, id, isSource],
  );

  const pagesToMap = useMemo(
    () => mapPageCount(id, data, graph.nodes, graph.edges),
    [id, data, graph.nodes, graph.edges],
  );
  const fanOut = getFanOut(id, data, graph);

  const status: NodeStatus = getNodeStatus({
    data,
    readiness,
    offline,
    fullRunState,
    elapsedMs: elapsed,
  });
  const tone = TONE_STYLES[status.tone];

  const inputConnected = graph.edges.some((edge) => edge.target === id);
  const outputConnected = graph.edges.some((edge) => edge.source === id);

  const title = isCustom ? (data.pipelineName ?? data.label) : data.label;
  const description = isSource
    ? ((data.params.assetFilename as string | undefined) ?? "Drop a file here or choose one")
    : isCustom
      ? (data.pipelineDescription ?? `${data.internalNodeCount ?? 0} steps · saved pipeline`)
      : getCategoryDescription(data.category);

  const otherHovered = useOtherNodeHovered(id);
  const showToolbar =
    !ui.readOnly &&
    (hovered || ui.quickSettingsNodeId === id || (selected && !otherHovered));
  const quickFields = getQuickParamSchema(data);

  // A node deleted while hovered must not keep other toolbars hidden.
  useEffect(() => () => clearHoveredToolbarNode(id), [id]);

  const onEnter = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHovered(true);
    setHoveredToolbarNode(id);
  };
  const onLeave = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHovered(false);
      clearHoveredToolbarNode(id);
    }, 180);
  };

  const run = () => {
    if (isSource && !data.params.assetId) {
      fileInputRef.current?.click();
      return;
    }
    void graph.runNode(id);
  };

  const onAction = (event: React.MouseEvent) => {
    event.stopPropagation();
    switch (status.action) {
      case "choose-file":
        fileInputRef.current?.click();
        break;
      case "run":
      case "retry":
        run();
        break;
      case "preview":
        ui.openInspector(id, "preview");
        break;
      case "stop":
        graph.cancelMapRun(id);
        break;
      case "fix":
        ui.openInspector(id, "parameters");
        break;
    }
  };

  const actionLabel: Record<NonNullable<NodeStatus["action"]>, string> = {
    "choose-file": "Choose file",
    run: isSource ? "Load" : "Run",
    retry: "Retry",
    preview: "Preview",
    stop: "Stop",
    fix: "How to fix",
  };

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onDoubleClick={() => ui.openInspector(id, "parameters")}
      onDragOver={(event) => {
        if (!isSource || ui.readOnly) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (!isSource || ui.readOnly) return;
        const file = event.dataTransfer.files[0];
        if (!file) return;
        event.preventDefault();
        event.stopPropagation();
        setDragOver(false);
        void upload.upload(file);
      }}
      className="group/node relative"
      style={{ width: FLOW_NODE_WIDTH }}
    >
      <NodeToolbar
        isVisible={showToolbar}
        position={Position.Top}
        offset={8}
        className="nodrag nopan"
      >
        <div
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="flex items-center gap-0.5 rounded-xl border border-border bg-popover/95 p-1 shadow-[0_8px_24px_-12px_rgba(20,18,37,0.35)] backdrop-blur"
        >
          {running && data.mapProgress ? (
            <ToolButton label="Stop" onClick={() => graph.cancelMapRun(id)} tone="danger">
              <Square className="size-3.5" />
            </ToolButton>
          ) : (
            <ToolButton
              label={isSource ? (data.params.assetId ? "Reload pages" : "Choose file") : "Run this node"}
              onClick={run}
              disabled={running || offline}
              tone="primary"
            >
              {isSource && !data.params.assetId ? (
                <FileUp className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </ToolButton>
          )}
          {quickFields.length > 0 ? (
            <Popover
              open={ui.quickSettingsNodeId === id}
              onOpenChange={(open) => ui.setQuickSettingsNodeId(open ? id : null)}
            >
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    aria-label="Quick settings"
                    className={cn(
                      "nodrag inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground",
                      ui.quickSettingsNodeId === id &&
                        "bg-primary/12 text-[var(--primary-text,var(--primary))]",
                    )}
                  />
                }
              >
                <SlidersHorizontal className="size-4" />
              </PopoverTrigger>
              <PopoverContent side="top" sideOffset={10} align="center" className="w-[300px]">
                <QuickSettings nodeId={id} data={data} fields={quickFields} />
              </PopoverContent>
            </Popover>
          ) : null}
          {pagesToMap > 1 && !running ? (
            <ToolButton
              label={`Apply to all ${pagesToMap} pages`}
              onClick={() => void graph.runNodeAllPages(id)}
              disabled={offline}
            >
              <Layers className="size-4" />
            </ToolButton>
          ) : null}
          {fanOut ? (
            <ToolButton
              label={fanOut.existingId ? "Show Items node" : fanOut.label}
              onClick={() => {
                const target = fanOut.existingId ?? fanOut.expand();
                if (target) graph.focusNode(target);
              }}
            >
              <Split className="size-4" />
            </ToolButton>
          ) : null}
          <ToolButton label="Open details" shortcut="↵" onClick={() => ui.openInspector(id)}>
            <Eye className="size-4" />
          </ToolButton>
          <ToolButton label="Duplicate" shortcut="Ctrl D" onClick={() => ui.duplicateNode(id)}>
            <Copy className="size-4" />
          </ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolButton label="Delete" shortcut="Del" tone="danger" onClick={() => ui.deleteNodes([id])}>
            <Trash2 className="size-4" />
          </ToolButton>
        </div>
      </NodeToolbar>

      {!isSource ? (
        <NodePin nodeId={id} side="input" kind={kinds.input} connected={inputConnected} />
      ) : null}

      <div
        className={cn(
          "flow-node relative flex flex-col overflow-hidden rounded-[14px] border bg-card text-left",
          "transition-[border-color,box-shadow,transform] duration-150",
          "border-border shadow-[0_1px_2px_rgba(20,18,37,0.06),0_6px_18px_-10px_rgba(20,18,37,0.25)]",
          "group-hover/node:border-foreground/20",
          selected &&
            "border-primary! shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_28%,transparent),0_14px_32px_-14px_color-mix(in_srgb,var(--primary)_45%,transparent)]",
          status.tone === "error" && !selected && "border-destructive/70",
          running && "flow-node--running",
          dragOver && "border-primary! border-dashed",
        )}
        style={{ height: FLOW_NODE_HEIGHT }}
      >
        {/* Header */}
        <div className="flex min-h-0 flex-1 items-start gap-2.5 px-3 pt-3">
          <span className="relative mt-0.5 flex shrink-0">
            <EngineMark provider={data.provider} size={36} dimmed={offline} />
            <span
              className={cn(
                "absolute -top-1 -left-1 size-2.5 rounded-full ring-2 ring-card",
                tone.dot,
              )}
              aria-hidden
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] leading-tight font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </p>
            <p
              className={cn(
                "mt-1 line-clamp-1 text-[11.5px] leading-snug text-muted-foreground",
                isSource && data.params.assetFilename && "font-mono text-[11px] text-foreground/80",
              )}
              title={description}
            >
              {description}
            </p>
          </div>
          <Popover>
            <PopoverTrigger
              openOnHover
              delay={250}
              render={
                <button
                  type="button"
                  aria-label="About this node"
                  className="nodrag -mt-0.5 -mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 opacity-0 transition-opacity group-hover/node:opacity-100 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100"
                />
              }
            >
              <Info className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-[280px] p-3.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {data.categoryLabel} · {data.provider}
              </p>
              <p className="mt-1.5 text-[13px] font-semibold">{title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {entry?.notes ?? getCategoryDescription(data.category)}
              </p>
              <div className="mt-3 flex items-center gap-2 font-mono text-[10.5px]">
                {!isSource ? (
                  <span className="flex items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-0.5">
                    <span className="size-1.5 rounded-full" style={{ background: wireColor(kinds.input) }} />
                    {wireKindLabel(kinds.input)}
                  </span>
                ) : null}
                {!isSource ? <span className="text-muted-foreground">→</span> : null}
                <span className="flex items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-0.5">
                  <span className="size-1.5 rounded-full" style={{ background: wireColor(kinds.output) }} />
                  {wireKindLabel(kinds.output)}
                </span>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer: status pill + metric/action */}
        <div className="flex h-9 shrink-0 items-center gap-2 border-t border-border/70 px-3">
          <span
            className={cn(
              "relative inline-flex h-[20px] min-w-[64px] items-center justify-center overflow-hidden rounded-full px-2 font-mono text-[10px] font-medium tracking-[0.06em] uppercase",
              tone.pill,
            )}
          >
            {status.progress != null && status.tone === "running" ? (
              <span
                className={cn("absolute inset-y-0 left-0 transition-[width] duration-300", tone.fill)}
                style={{ width: `${Math.round(status.progress * 100)}%` }}
              />
            ) : null}
            {status.tone === "running" && status.progress == null ? (
              <span className="flow-pill-shimmer absolute inset-0" />
            ) : null}
            <span className="relative flex items-center gap-1">
              {status.tone === "running" ? <Loader2 className="size-2.5 animate-spin" /> : null}
              {status.tone === "error" || status.tone === "offline" ? (
                <TriangleAlert className="size-2.5" />
              ) : null}
              {status.pill}
            </span>
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-[10.5px]",
              status.tone === "error" ? "text-destructive/90" : "text-muted-foreground",
            )}
            title={status.tone === "error" ? data.runResult?.error : undefined}
          >
            {upload.uploading ? "Uploading…" : (upload.error ?? status.detail)}
          </span>
          {status.action && !ui.readOnly ? (
            <button
              type="button"
              onClick={onAction}
              className={cn(
                "nodrag inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors",
                status.action === "preview"
                  ? "text-[var(--primary-text,var(--primary))] hover:bg-primary/10"
                  : status.action === "retry" || status.action === "stop"
                    ? "text-destructive hover:bg-destructive/10"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {status.action === "retry" ? <RotateCcw className="size-3" /> : null}
              {status.action === "choose-file" ? <FileUp className="size-3" /> : null}
              {status.action === "run" ? <Play className="size-3" /> : null}
              {actionLabel[status.action]}
            </button>
          ) : null}
        </div>
      </div>

      <NodePin nodeId={id} side="output" kind={kinds.output} connected={outputConnected} />

      {isSource ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={upload.accept.accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload.upload(file);
            event.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
