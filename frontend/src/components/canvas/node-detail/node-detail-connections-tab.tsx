"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { CompatibleStepsPanel } from "@/components/canvas/node-detail/compatible-nodes-list";
import { DetailSection } from "@/components/canvas/node-detail/detail-section";
import { NodeConnectionDiagram } from "@/components/canvas/node-detail/node-connection-diagram";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { edgeLabelForHandle } from "@/lib/canvas/connection-validation";
import { PAGE_AT_MODEL_ID, PAGE_BRANCH_MODEL_ID } from "@/lib/canvas/page-branch-meta";
import { parseSourceHandle } from "@/lib/canvas/output-slice";
import {
  getDownstreamConnections,
  getRequiredInputKind,
  resolveNodeEffectiveOutput,
  upstreamSatisfiesInput,
} from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";
import { formatArtifactKind } from "@/lib/canvas/wire-labels";
import { cn } from "@/lib/utils";

type NodeDetailConnectionsTabProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
};

const TO_PREVIEW_LIMIT = 4;

export function NodeDetailConnectionsTab({
  nodeId,
  data,
  upstream,
}: NodeDetailConnectionsTabProps) {
  const { nodes, edges, modelCatalog, categories } = usePipelineGraphActions();
  const [showAllTo, setShowAllTo] = useState(false);

  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const downstream = getDownstreamConnections(nodeId, nodes, edges);
  const requiredInput = getRequiredInputKind(data.modelId, data.inputType);
  const inputOk =
    requiredInput === "file" ||
    requiredInput === "document_input" ||
    upstreamSatisfiesInput(requiredInput, upstream.output);

  const upstreamNode = upstream.nodeId
    ? nodes.find((n) => n.id === upstream.nodeId)
    : null;

  const visibleTo = showAllTo ? downstream : downstream.slice(0, TO_PREVIEW_LIMIT);
  const hasMoreTo = downstream.length > TO_PREVIEW_LIMIT;

  let inputVariant: "active" | "warn" = "active";
  if (!isSourceLoader && !inputOk) {
    inputVariant = upstreamNode ? "warn" : "active";
  }

  return (
    <div className="space-y-5 px-[18px] py-4 pb-6">
      <NodeConnectionDiagram
        provider={data.provider}
        categoryColor={data.categoryColor}
        inputType={data.inputType}
        outputType={data.outputType}
        hasInput={!isSourceLoader}
        inputVariant={inputVariant}
      />

      {!isSourceLoader && (
        <DetailSection title="From" className="border-b-0 px-0 py-0">
          {upstreamNode ? (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                inputOk
                  ? "border-[var(--status-ok)]/30 bg-[var(--status-ok)]/6"
                  : "border-destructive/35 bg-destructive/5",
              )}
            >
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  inputOk ? "bg-[var(--status-ok)]" : "bg-destructive",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {upstreamNode.data.label}
                </p>
                {upstream.output && (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Sends {formatArtifactKind(upstream.output.kind)}
                  </p>
                )}
                {!inputOk && (
                  <p className="mt-1 text-[10px] text-destructive">
                    Output does not match this node&apos;s In type
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              No input connected yet — pick a compatible node below.
            </p>
          )}
        </DetailSection>
      )}

      <DetailSection title="To" className={cn("px-0", !isSourceLoader && "mt-0")}>
        {downstream.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Wire this node&apos;s Out to the next step on the canvas.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {visibleTo.map((conn) => {
                const parsed = parseSourceHandle(conn.sourceHandle);
                const selfNode = nodes.find((n) => n.id === nodeId);
                const effectiveOutput = selfNode
                  ? resolveNodeEffectiveOutput(
                      selfNode,
                      nodes,
                      edges,
                      conn.sourceHandle,
                    )
                  : data.cachedOutput ?? null;
                const wireLabel =
                  parsed.scope === "item" || parsed.scope === "all"
                    ? edgeLabelForHandle(effectiveOutput, conn.sourceHandle) ??
                      (parsed.scope === "all" &&
                      (data.modelId === PAGE_AT_MODEL_ID ||
                        data.modelId === PAGE_BRANCH_MODEL_ID)
                        ? `p.${Number(data.params.page_index ?? 0) + 1} · selected`
                        : null)
                    : null;

                return (
                  <li
                    key={conn.edgeId}
                    className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2.5"
                  >
                    <ArrowRight
                      className="mt-0.5 size-3.5 shrink-0 text-primary/70"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {conn.label}
                      </p>
                      {wireLabel && (
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          via {wireLabel}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMoreTo && (
              <button
                type="button"
                onClick={() => setShowAllTo((v) => !v)}
                className="mt-2 font-mono text-[9px] tracking-wide text-primary uppercase hover:text-primary/80"
              >
                {showAllTo ? "Show less" : `Show all (${downstream.length})`}
              </button>
            )}
          </>
        )}
      </DetailSection>

      <CompatibleStepsPanel
        targetData={data}
        sourceData={data}
        models={modelCatalog}
        categories={categories}
        showPreviousSteps={!isSourceLoader}
      />
    </div>
  );
}
