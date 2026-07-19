"use client";

import Image from "next/image";
import Link from "next/link";

import type { PipelineNodeData } from "@/lib/canvas/types";
import { topologicalSortFromRecords } from "@/lib/canvas/pipeline-boundary-sort";
import { parsePipelineGraph } from "@/lib/canvas/graph-utils";
import { getCategoryColor } from "@/lib/canvas/category-meta";
import { getModelLabel } from "@/lib/canvas/model-utils";
import type { ModelCatalogEntry } from "@/lib/canvas/types";

type CustomPipelineDetailOverviewProps = {
  data: PipelineNodeData;
  pipelineGraph?: Record<string, unknown>;
  modelCatalog: ModelCatalogEntry[];
};

export function CustomPipelineDetailOverview({
  data,
  pipelineGraph,
  modelCatalog,
}: CustomPipelineDetailOverviewProps) {
  const graph = pipelineGraph ? parsePipelineGraph(pipelineGraph) : null;
  const orderedIds =
    graph != null
      ? topologicalSortFromRecords(graph.nodes, graph.edges)
      : data.internalModelIds ?? [];
  const modelMap = new Map(modelCatalog.map((m) => [m.id, m]));

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-start gap-3">
        {data.pipelineLogoUrl ? (
          <Image
            src={data.pipelineLogoUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg object-cover"
            unoptimized
          />
        ) : (
          <Image
            src="/brand/mark.svg"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg bg-primary/10 p-2 object-contain"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">
            {data.pipelineName ?? data.label}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.pipelineDescription?.trim() || "No description."}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 font-mono text-[11px]">
        <div className="text-muted-foreground">Input</div>
        <div className="text-foreground">{data.inputType}</div>
        <div className="mt-2 text-muted-foreground">Output</div>
        <div className="text-foreground">{data.outputType}</div>
      </div>

      {data.pipelineId ? (
        <Link
          href={`/app/pipelines/${data.pipelineId}/canvas`}
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Edit in Pipelines →
        </Link>
      ) : null}

      <div>
        <h4 className="mb-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Internal steps
        </h4>
        <ol className="space-y-2">
          {(graph?.nodes.length
            ? graph.nodes.sort(
                (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id),
              )
            : (data.internalModelIds ?? []).map((modelId, index) => ({
                id: `step-${index}`,
                modelId,
              }))
          ).map((step, index) => {
              const entry = modelMap.get(step.modelId);
          const label = entry ? getModelLabel(entry) : step.modelId;
          const color = getCategoryColor(entry?.category ?? "assembler");
              return (
                <li
                  key={step.id}
                  className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-2 text-sm"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{label}</span>
                </li>
              );
            })}
        </ol>
      </div>
    </div>
  );
}
