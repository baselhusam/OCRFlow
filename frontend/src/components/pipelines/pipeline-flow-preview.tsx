"use client";

import type { Pipeline } from "@/lib/api/client";
import { parsePipelineGraph } from "@/lib/canvas/graph-utils";
import { topologicalSortFromRecords } from "@/lib/canvas/pipeline-boundary-sort";
import { cn } from "@/lib/utils";

type PipelineFlowPreviewProps = {
  pipeline: Pipeline;
  className?: string;
};

export function PipelineFlowPreview({
  pipeline,
  className,
}: PipelineFlowPreviewProps) {
  const graph = parsePipelineGraph(pipeline.graph);
  const orderedIds = topologicalSortFromRecords(graph.nodes, graph.edges);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const steps = orderedIds
    .map((id) => nodeById.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .slice(0, 8);

  if (steps.length === 0) {
    return (
      <div
        className={cn(
          "flex h-14 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground",
          className,
        )}
      >
        Empty pipeline
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)]",
        className,
      )}
    >
      <div className="flex items-stretch divide-x divide-[var(--landing-node-border)] overflow-x-auto">
        {steps.map((node, index) => {
          const label =
            node.modelId.split("/").pop()?.replace(/-/g, " ") ?? node.modelId;

          return (
            <div
              key={node.id}
              className="group relative flex min-w-[72px] flex-1 flex-col px-3 py-2.5 transition-colors hover:bg-primary/[0.04]"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-px z-10 hidden h-px w-2 bg-primary/40 md:block"
                />
              ) : null}
              <span
                className="h-1 w-6 rounded-full"
                style={{
                  backgroundColor: pipeline.accent_color,
                  opacity: 0.45 + index * 0.08,
                }}
              />
              <span className="mt-2 truncate font-mono text-[10px] tracking-wide text-foreground uppercase">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
