"use client";

import { ArrowRight, ChevronDown, GitBranch } from "lucide-react";
import { useState } from "react";

import { NodeDetailConnectionsTab } from "@/components/canvas/node-detail/node-detail-connections-tab";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import {
  getDownstreamConnections,
  getRequiredInputKind,
  upstreamSatisfiesInput,
  type UpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { cn } from "@/lib/utils";

type NodeDetailConnectionsStripProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
};

/**
 * One-line "from → this → to" summary at the top of the inspector. Expands
 * into the full connections view (diagram, compatible steps) on demand, so
 * wiring context is always visible without hiding setup behind a tab.
 */
export function NodeDetailConnectionsStrip({
  nodeId,
  data,
  upstream,
}: NodeDetailConnectionsStripProps) {
  const { nodes, edges, focusNode } = usePipelineGraphActions();
  const [open, setOpen] = useState(false);

  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const upstreamNode = upstream.nodeId
    ? nodes.find((node) => node.id === upstream.nodeId)
    : null;
  const downstream = getDownstreamConnections(nodeId, nodes, edges);
  const requiredInput = getRequiredInputKind(data.modelId, data.inputType);
  const inputOk =
    requiredInput === "file" ||
    requiredInput === "document_input" ||
    upstreamSatisfiesInput(requiredInput, upstream.output);
  const inputWarn = !isSourceLoader && Boolean(upstreamNode) && !inputOk;
  const inputMissing = !isSourceLoader && !upstreamNode;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-border/60 bg-muted/15">
        <div className="flex items-center gap-1.5 px-[18px] py-2">
          <GitBranch
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />

          {/* From */}
          {isSourceLoader ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              source · {formatWireLabel(data.outputType)}
            </span>
          ) : upstreamNode ? (
            <button
              type="button"
              className={cn(
                "flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[11px] transition-colors hover:border-foreground/30",
                inputWarn
                  ? "border-[var(--status-warn)]/50 bg-[var(--status-warn)]/8 text-foreground"
                  : "border-border/60 bg-card text-foreground",
              )}
              title={`Go to ${upstreamNode.data.label}`}
              onClick={() => focusNode(upstreamNode.id)}
            >
              <span className="truncate font-medium">
                {upstreamNode.data.label}
              </span>
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                {formatWireLabel(upstreamNode.data.outputType)}
              </span>
              {inputWarn && (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-[var(--status-warn)]"
                  aria-label="Input type mismatch"
                />
              )}
            </button>
          ) : (
            <span
              className={cn(
                "rounded-md border border-dashed px-1.5 py-0.5 text-[10.5px]",
                inputMissing
                  ? "border-[var(--status-warn)]/50 text-[var(--status-warn)]"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              no input
            </span>
          )}

          <ArrowRight
            className="size-3 shrink-0 text-muted-foreground/60"
            aria-hidden
          />

          {/* To */}
          {downstream.length === 0 ? (
            <span className="rounded-md border border-dashed border-border/60 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
              not connected
            </span>
          ) : downstream.length === 1 ? (
            <button
              type="button"
              className="flex min-w-0 items-center gap-1 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-left text-[11px] text-foreground transition-colors hover:border-foreground/30"
              title={`Go to ${downstream[0].label}`}
              onClick={() => focusNode(downstream[0].nodeId)}
            >
              <span className="truncate font-medium">
                {downstream[0].label}
              </span>
            </button>
          ) : (
            <span className="rounded-md border border-border/60 bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              {downstream.length} nodes
            </span>
          )}

          <CollapsibleTrigger
            className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-secondary/60 hover:text-foreground"
            aria-label={
              open ? "Hide connection details" : "Show connection details"
            }
          >
            {open ? "Less" : "More"}
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border/50 bg-card">
            <NodeDetailConnectionsTab
              nodeId={nodeId}
              data={data}
              upstream={upstream}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
