"use client";

import { ParamSlider } from "@/components/canvas/param-slider";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { NodeTestRun } from "@/components/canvas/nodes/node-test-run";
import { Input } from "@/components/ui/input";
import {
  getInlineParamSchema,
  isSliderParam,
} from "@/lib/canvas/node-param-schema";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import {
  displayToPageIndex,
  pageIndexToDisplay,
} from "@/lib/canvas/page-index-display";
import type { PipelineNodeData } from "@/lib/canvas/types";

type PipelineNodeParamsProps = {
  nodeId: string;
  data: PipelineNodeData;
};

export function PipelineNodeParams({ nodeId, data }: PipelineNodeParamsProps) {
  const { updateNodeConfig } = usePipelineGraphActions();
  const isLayoutDetection = data.category === "layout_detection";
  const editable = getInlineParamSchema(data.modelId, data.category);
  const paramErrors = validateNodeParams(data.modelId, data.params);

  const readOnlyEntries = Object.entries(data.params).filter(
    ([key]) =>
      !editable.some((field) => field.key === key) && !key.startsWith("asset"),
  );

  if (isLayoutDetection) {
    return (
      <div className="flex flex-col gap-2">
        {paramErrors.length > 0 && (
          <div className="space-y-0.5 px-1">
            {paramErrors.map((error) => (
              <p key={error} className="text-[9px] text-destructive">
                {error}
              </p>
            ))}
          </div>
        )}
        <NodeTestRun nodeId={nodeId} data={data} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {editable.length > 0 && (
        <div className="space-y-2 bg-muted/20 rounded-lg p-2 border border-border/50">
          <p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Parameters
          </p>
          {editable.map((field) => (
            <label key={field.key} className="block space-y-1">
              <span className="text-[10px] text-muted-foreground">
                {field.label}
              </span>
              {isSliderParam(field) ? (
                <ParamSlider
                  value={Number(data.params[field.key] ?? field.min ?? 0)}
                  min={field.min ?? 0}
                  max={field.max ?? 1}
                  step={field.step}
                  onChange={(val) =>
                    updateNodeConfig(nodeId, { [field.key]: val })
                  }
                />
              ) : (
                <Input
                  type={field.type}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className="h-7 font-mono text-xs bg-background"
                  value={String(
                    field.displayOffset
                      ? pageIndexToDisplay(Number(data.params[field.key] ?? 0))
                      : (data.params[field.key] ?? ""),
                  )}
                  onChange={(e) => {
                    const raw =
                      field.type === "number"
                        ? Number(e.target.value)
                        : e.target.value;
                    const val =
                      field.type === "number" && field.displayOffset
                        ? displayToPageIndex(Number(raw))
                        : raw;
                    updateNodeConfig(nodeId, { [field.key]: val });
                  }}
                />
              )}
            </label>
          ))}
        </div>
      )}

      {readOnlyEntries.length > 0 && editable.length === 0 && (
        <div className="space-y-1.5 bg-muted/20 rounded-lg p-2 border border-border/50">
          <p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Parameters
          </p>
          <div className="space-y-1">
            {readOnlyEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-muted-foreground">
                  {key}
                </span>
                <span className="shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] text-foreground/80">
                  {typeof value === "boolean"
                    ? value
                      ? "true"
                      : "false"
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {paramErrors.length > 0 && (
        <div className="space-y-0.5 px-1">
          {paramErrors.map((error) => (
            <p key={error} className="text-[9px] text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      <NodeTestRun nodeId={nodeId} data={data} />
    </div>
  );
}
