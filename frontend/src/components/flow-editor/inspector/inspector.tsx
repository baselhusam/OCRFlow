"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BookOpen,
  FileUp,
  Loader2,
  Play,
  Layers,
  Plus,
  RotateCcw,
  Split,
  Square,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { NodeGuideDialog } from "@/components/canvas/node-guide/node-guide-dialog";
import { CustomPipelineDetailOverview } from "@/components/canvas/node-detail/custom-pipeline-detail-overview";
import { NodeDetailPreviewSection } from "@/components/canvas/node-detail/node-detail-preview-section";
import { NodeDetailSetupTab } from "@/components/canvas/node-detail/node-detail-setup-tab";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import { PlannedNodeNotice } from "@/components/canvas/node-detail/planned-node-notice";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { EngineMark } from "@/components/flow-editor/library/engine-mark";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import { useEditorUi, type InspectorTab } from "@/components/flow-editor/editor-ui-context";
import {
  getFanOut,
  isSpawnOnlyModel,
  mapPageCount,
} from "@/components/flow-editor/node-capabilities";
import { getNodeStatus, TONE_STYLES } from "@/components/flow-editor/node-status";
import { wireColor, wireKindLabel } from "@/components/flow-editor/wire-colors";
import { RelativeTime } from "@/components/relative-time";
import { getCategoryDescription, SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { getCompatibleDownstreamModels } from "@/lib/canvas/compatible-downstream-models";
import { isCustomPipelineNodeData } from "@/lib/canvas/custom-pipeline-node-data";
import { getModelLabel } from "@/lib/canvas/model-utils";
import { hasNodeGuide } from "@/lib/canvas/node-guide-registry";
import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import { isPageBranchNode } from "@/lib/canvas/page-branch-meta";
import { providerOfflineMessage } from "@/lib/canvas/provider-availability";
import { isRegionBranchNode } from "@/lib/canvas/region-branch-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { getNodeWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";

export const INSPECTOR_WIDTH = 400;

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "parameters", label: "Parameters" },
  { id: "preview", label: "Preview" },
  { id: "connections", label: "Connections" },
];

function ConnectionsTab({ nodeId, data }: { nodeId: string; data: PipelineNodeData }) {
  const graph = usePipelineGraphActions();
  const ui = useEditorUi();
  const incoming = graph.edges.filter((edge) => edge.target === nodeId);
  const outgoing = graph.edges.filter((edge) => edge.source === nodeId);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const kinds = getNodeWireKinds(data);
  const isSource = SOURCE_NODE_MODELS.has(data.modelId);

  const next = useMemo(
    () =>
      getCompatibleDownstreamModels(data, graph.modelCatalog, graph.categories)
        .filter((entry) => !isSpawnOnlyModel(entry.model.id))
        .slice(0, 12),
    [data, graph.modelCatalog, graph.categories],
  );

  const Row = ({ otherId, direction }: { otherId: string; direction: "in" | "out" }) => {
    const other = byId.get(otherId);
    if (!other) return null;
    const otherKinds = getNodeWireKinds(other.data);
    const kind = direction === "in" ? otherKinds.output : kinds.output;
    return (
      <button
        type="button"
        onClick={() => {
          graph.focusNode(otherId);
          ui.openInspector(otherId);
        }}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-foreground/[0.03]"
      >
        <EngineMark provider={other.data.provider} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{other.data.label}</span>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: wireColor(kind) }} />
            {wireKindLabel(kind)}
          </span>
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      {!isSource ? (
        <section>
          <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <ArrowDownToLine className="size-3" /> Input · {wireKindLabel(kinds.input)}
          </h3>
          {incoming.length ? (
            <div className="flex flex-col gap-1.5">
              {incoming.map((edge) => (
                <Row key={edge.id} otherId={edge.source} direction="in" />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
              Nothing connected. Drag a wire from a node that outputs{" "}
              <span className="font-medium text-foreground">{wireKindLabel(kinds.input)}</span> into this
              node&apos;s left pin.
            </p>
          )}
        </section>
      ) : null}
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <ArrowUpFromLine className="size-3" /> Output · {wireKindLabel(kinds.output)}
        </h3>
        {outgoing.length ? (
          <div className="flex flex-col gap-1.5">
            {outgoing.map((edge) => (
              <Row key={edge.id} otherId={edge.target} direction="out" />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">Not feeding anything yet.</p>
        )}
      </section>
      {!ui.readOnly && next.length ? (
        <section>
          <h3 className="mb-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Can connect next
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {next.map((entry) => (
              <button
                key={entry.model.id}
                type="button"
                onClick={() => ui.addConnectedNode(entry.model.id, nodeId)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2.5 pl-1 text-[12px] transition-colors hover:border-primary/50 hover:bg-primary/[0.06]"
              >
                <EngineMark provider={entry.model.provider} size={20} className="rounded-full!" />
                {getModelLabel(entry.model)}
                <Plus className="size-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InspectorBody({ nodeId }: { nodeId: string }) {
  const graph = usePipelineGraphActions();
  const ui = useEditorUi();
  const { getModelStatus } = useRuntimeAvailability();
  const node = graph.nodes.find((entry) => entry.id === nodeId);
  const [infoOpen, setInfoOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  if (!node) return null;
  const data = node.data;
  const isSource = SOURCE_NODE_MODELS.has(data.modelId);
  const isCustom = isCustomPipelineNodeData(data);
  const isItems = isPageBranchNode(data.modelId) || isRegionBranchNode(data.modelId);
  const kinds = getNodeWireKinds(data);
  const upstream = graph.getUpstream(nodeId, kinds.input);
  const entry = graph.modelCatalog.find((model) => model.id === data.modelId);
  const offline = entry ? getModelStatus(entry).offline : false;
  const readiness = isSource
    ? null
    : getNodeTestRunReadiness(nodeId, graph.nodes, graph.edges, graph.projectId);
  const status = getNodeStatus({
    data,
    readiness,
    offline,
    fullRunState: ui.fullRunNodeStates.get(nodeId),
  });
  const tone = TONE_STYLES[status.tone];
  const running = status.tone === "running";
  const pagesToMap = mapPageCount(nodeId, data, graph.nodes, graph.edges);
  const fanOut = getFanOut(nodeId, data, graph);
  const title = isCustom ? (data.pipelineName ?? data.label) : isItems ? "Items" : data.label;
  const description = isCustom
    ? (data.pipelineDescription ?? "Saved pipeline")
    : getCategoryDescription(data.category);
  // Catalog notes are often terse facts ("Model weights: Open Rail-M"); show
  // them as a footnote rather than as the node's description.
  const notes = !isCustom && entry?.notes && entry.notes !== description ? entry.notes : null;
  const previewBadge = data.cachedOutput?.kind;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-5 pt-4 pb-0">
        <div className="flex items-start gap-3">
          <EngineMark provider={data.provider} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] leading-tight font-semibold tracking-[-0.01em]">{title}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {data.provider} · {data.categoryLabel}
              </span>
              <span
                className={cn(
                  "inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 font-mono text-[9.5px] font-medium tracking-[0.06em] uppercase",
                  tone.pill,
                )}
              >
                {status.pill}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={ui.closeInspector}
            aria-label="Close inspector"
            className="-mt-1 -mr-2 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <p
          className={cn(
            "mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground",
            !infoOpen && "line-clamp-2",
          )}
        >
          {description}
        </p>
        {notes ? (
          <p className="mt-1 line-clamp-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground/80" title={notes}>
            {notes}
          </p>
        ) : null}
        {hasNodeGuide(data.modelId) ? (
          <NodeGuideDialog
            data={data}
            trigger={
              <button
                type="button"
                className="mt-2 mr-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--primary-text,var(--primary))] hover:underline"
              >
                <BookOpen className="size-3.5" /> How this node works
              </button>
            }
          />
        ) : null}
        {description.length > 110 ? (
          <button
            type="button"
            onClick={() => setInfoOpen((value) => !value)}
            className="mt-0.5 text-[11.5px] font-medium text-[var(--primary-text,var(--primary))]"
          >
            {infoOpen ? "Show less" : "Show more"}
          </button>
        ) : null}

        <div role="tablist" className="mt-3 -mb-px flex gap-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={ui.inspectorTab === tab.id}
              onClick={() => ui.setInspectorTab(tab.id)}
              className={cn(
                "relative flex h-9 items-center gap-1.5 text-[13px] font-medium transition-colors",
                ui.inspectorTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.id === "preview" && previewBadge ? (
                <span className="rounded bg-muted px-1 py-px font-mono text-[9.5px] text-muted-foreground">
                  {previewBadge}
                </span>
              ) : null}
              {ui.inspectorTab === tab.id ? (
                <motion.span
                  layoutId="inspector-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary"
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {offline && entry ? (
          <div className="mx-5 mt-4 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 text-[12px] leading-relaxed">
            <p className="font-semibold text-destructive">Engine offline</p>
            <p className="mt-0.5 text-muted-foreground">{providerOfflineMessage(entry.provider)}</p>
          </div>
        ) : null}
        {data.runStatus === "error" && data.runResult?.error ? (
          <div className="px-5 pt-4">
            <NodeErrorPanel
              error={data.runResult.error}
              errorCode={data.runResult.errorCode}
              errorContext={data.runResult.errorContext}
              nodeLabel={data.label}
              compact
            />
          </div>
        ) : null}
        {ui.inspectorTab === "parameters" ? (
          isCustom ? (
            <CustomPipelineDetailOverview data={data} modelCatalog={graph.modelCatalog} />
          ) : isItems ? (
            <p className="px-5 py-5 text-[12.5px] leading-relaxed text-muted-foreground">
              Every item of the upstream collection gets its own output pin on the canvas. Drag
              from a pin to send that one item downstream, or tick several items and wire the
              group pin.
            </p>
          ) : (
            <>
              <PlannedNodeNotice data={data} />
              {readiness && !readiness.ready ? (
                <div className="mx-5 mt-4 rounded-lg border border-[var(--status-warn)]/35 bg-[color-mix(in_srgb,var(--status-warn)_8%,transparent)] px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-[var(--status-warn)]">Before this can run</p>
                  <ul className="mt-1 list-disc pl-4 text-[12px] leading-relaxed text-muted-foreground">
                    {readiness.issues.slice(0, 4).map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <NodeDetailSetupTab nodeId={nodeId} data={data} />
            </>
          )
        ) : null}
        {ui.inspectorTab === "preview" && fanOut && !ui.readOnly ? (
          <div className="mx-5 mt-4 flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
            <Split className="size-4 shrink-0 text-[var(--primary-text,var(--primary))]" />
            <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
              Send individual items to different models with an Items node.
            </p>
            <button
              type="button"
              onClick={() => {
                const target = fanOut.existingId ?? fanOut.expand();
                if (target) graph.focusNode(target);
              }}
              className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--primary-text,var(--primary))] hover:bg-primary/15"
            >
              {fanOut.existingId ? "Show Items" : fanOut.label}
            </button>
          </div>
        ) : null}
        {ui.inspectorTab === "preview" ? (
          <NodeDetailPreviewSection key={nodeId} nodeId={nodeId} data={data} upstream={upstream} />
        ) : null}
        {ui.inspectorTab === "connections" ? <ConnectionsTab nodeId={nodeId} data={data} /> : null}
      </div>

      {/* Footer */}
      {!isItems ? (
        <div className="flex shrink-0 items-center gap-3 border-t border-border px-5 py-3">
          <div className="min-w-0 flex-1 font-mono text-[11px] text-muted-foreground">
            {running ? (
              <span className="flex items-center gap-1.5 text-[var(--primary-text,var(--primary))]">
                <Loader2 className="size-3 animate-spin" /> {status.detail ?? "Running…"}
              </span>
            ) : data.lastRunAt ? (
              <span className="block truncate">
                {status.detail ? `${status.detail} · ` : ""}
                <RelativeTime value={data.lastRunAt} />
              </span>
            ) : (
              <span>Never run</span>
            )}
          </div>
          {!ui.readOnly ? (
            running && data.mapProgress ? (
              <button
                type="button"
                onClick={() => graph.cancelMapRun(nodeId)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/40 px-3.5 text-[13px] font-semibold text-destructive hover:bg-destructive/[0.08]"
              >
                <Square className="size-3.5 fill-current" /> Stop
              </button>
            ) : (
              <>
              {pagesToMap > 1 ? (
                <button
                  type="button"
                  disabled={running || offline}
                  onClick={() => {
                    ui.setInspectorTab("preview");
                    void graph.runNodeAllPages(nodeId);
                  }}
                  title="Run this node once per page"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-medium transition-colors hover:border-foreground/25 disabled:opacity-50"
                >
                  <Layers className="size-3.5" /> All {pagesToMap} pages
                </button>
              ) : null}
              {isSource && !data.params.assetId ? (
                <button
                  type="button"
                  disabled={running}
                  onClick={() => {
                    // The document picker lives in the Parameters tab.
                    ui.setInspectorTab("parameters");
                    requestAnimationFrame(() =>
                      bodyRef.current?.querySelector<HTMLInputElement>("input[type=file]")?.click(),
                    );
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_var(--primary)] transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
                >
                  <FileUp className="size-3.5" />
                  Choose file
                </button>
              ) : (
              <button
                type="button"
                disabled={running || offline}
                onClick={() => {
                  ui.setInspectorTab("preview");
                  void graph.runNode(nodeId);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_var(--primary)] transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
              >
                {status.tone === "error" ? (
                  <RotateCcw className="size-3.5" />
                ) : (
                  <Play className="size-3.5 fill-current" />
                )}
                {status.tone === "error"
                  ? "Retry"
                  : isSource
                    ? "Reload pages"
                    : data.cachedOutput
                      ? "Run again"
                      : "Run node"}
              </button>
              )}
              </>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * `overlay`: float over the canvas (narrow windows) instead of docking beside
 * it and squeezing the canvas.
 */
export function Inspector({ overlay = false }: { overlay?: boolean }) {
  const graph = usePipelineGraphActions();
  const ui = useEditorUi();
  const nodeId = ui.inspectorOpen ? graph.selectedNodeId : null;
  const exists = nodeId ? graph.nodes.some((node) => node.id === nodeId) : false;

  return (
    <AnimatePresence initial={false}>
      {nodeId && exists ? (
        <motion.aside
          key="inspector"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: INSPECTOR_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "h-full max-w-full shrink-0 overflow-hidden border-l border-border bg-card",
            overlay
              ? "absolute inset-y-0 right-0 z-30 shadow-[-16px_0_40px_-20px_rgba(20,18,37,0.45)]"
              : "relative z-10",
          )}
        >
          <div className="h-full max-w-[100vw]" style={{ width: INSPECTOR_WIDTH }}>
            <InspectorBody nodeId={nodeId} />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
