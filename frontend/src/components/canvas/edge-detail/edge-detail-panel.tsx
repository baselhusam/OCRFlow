"use client";

import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { listOutputItems, parseSourceHandle } from "@/lib/canvas/output-slice";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PipelineNodeData } from "@/lib/canvas/types";

function useSelectedEdgeDetail() {
  const { selectedEdgeId, edges, nodes } = usePipelineGraphActions();

  return useMemo(() => {
    if (!selectedEdgeId) {
      return null;
    }

    const edge = edges.find((e) => e.id === selectedEdgeId) ?? null;
    if (!edge) {
      return null;
    }

    const sourceNode = nodes.find((n) => n.id === edge.source) ?? null;
    const targetNode = nodes.find((n) => n.id === edge.target) ?? null;
    if (!sourceNode || !targetNode) {
      return null;
    }

    return { edge, sourceNode, targetNode };
  }, [selectedEdgeId, edges, nodes]);
}

function EdgeDetailBody({
  edge,
  sourceNode,
  targetNode,
  onClose,
}: {
  edge: Edge;
  sourceNode: Node<PipelineNodeData>;
  targetNode: Node<PipelineNodeData>;
  onClose: () => void;
}) {
  const { updateEdgeSourceHandle } = usePipelineGraphActions();

  const outputItems = useMemo(
    () => listOutputItems(sourceNode.data.cachedOutput ?? null),
    [sourceNode],
  );

  const parsed = parseSourceHandle(edge.sourceHandle);
  const currentHandle = edge.sourceHandle ?? "output";

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Connection
          </p>
          <p className="truncate text-sm text-foreground">
            {sourceNode.data.label}
            <span className="mx-1 text-muted-foreground">→</span>
            {targetNode.data.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 font-mono text-[9px] text-muted-foreground uppercase hover:text-foreground"
        >
          Close
        </button>
      </div>

      {outputItems.length > 0 ? (
        <div className="space-y-1.5">
          <label
            htmlFor="edge-source-output"
            className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase"
          >
            Source output
          </label>
          <select
            id="edge-source-output"
            value={currentHandle}
            onChange={(e) => updateEdgeSourceHandle(edge.id, e.target.value)}
            className="h-8 w-full rounded-sm border border-border bg-background px-2 font-mono text-[11px] text-foreground"
          >
            <option value="output">
              All outputs ({outputItems.length} items)
            </option>
            {outputItems.map((item) => (
              <option key={item.handle} value={item.handle}>
                {item.id} · {item.label}
              </option>
            ))}
          </select>
          {parsed.scope === "item" && (
            <p className="font-mono text-[9px] text-muted-foreground">
              Only the selected item is passed when this node runs.
            </p>
          )}
        </div>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          Run the source node to pick a specific output item.
        </p>
      )}
    </>
  );
}

export function EdgeDetailPanel() {
  const { selectedNodeId, clearSelection } = usePipelineGraphActions();
  const edgeDetail = useSelectedEdgeDetail();
  const isMobile = useIsMobile();

  if (!edgeDetail || selectedNodeId) {
    return null;
  }

  const { edge, sourceNode, targetNode } = edgeDetail;

  if (isMobile) {
    return (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
      >
        <SheetContent side="bottom" className="max-h-[40vh] p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Connection details</SheetTitle>
          </SheetHeader>
          <EdgeDetailBody
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            onClose={clearSelection}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto absolute bottom-16 left-1/2 z-20 w-[min(96vw,28rem)] -translate-x-1/2 rounded-sm border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm",
      )}
    >
      <EdgeDetailBody
        edge={edge}
        sourceNode={sourceNode}
        targetNode={targetNode}
        onClose={clearSelection}
      />
    </aside>
  );
}
