"use client";

import Image from "next/image";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Loader2 } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export function CustomPipelineNode({ data, selected }: NodeProps) {
  const nodeData = data as PipelineNodeData;
  const accent = nodeData.pipelineAccentColor ?? "#5B2EEF";
  const isRunning = nodeData.runStatus === "running";
  const isError = nodeData.runStatus === "error";
  const isSuccess = nodeData.runStatus === "success";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "min-w-[200px] max-w-[260px] rounded-xl border-2 bg-card shadow-md transition-shadow",
              selected && "ring-2 ring-primary/40",
              isError && "border-destructive/60",
              isSuccess && "border-emerald-500/50",
            )}
            style={{
              borderColor: selected ? accent : `${accent}66`,
              boxShadow: `0 4px 24px -8px ${accent}44`,
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id="input"
              className="!size-2.5 !border-2 !border-background !bg-primary"
            />

            <div
              className="flex items-center gap-2.5 border-b px-3 py-2.5"
              style={{ background: `${accent}12` }}
            >
              {nodeData.pipelineLogoUrl ? (
                <Image
                  src={nodeData.pipelineLogoUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <Image
                  src="/brand/mark.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-md bg-primary/10 p-1 object-contain"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {nodeData.pipelineName ?? nodeData.label}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {nodeData.inputType} → {nodeData.outputType}
                </p>
              </div>
              {isRunning ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              ) : null}
            </div>

            <div className="px-3 py-2">
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {nodeData.pipelineDescription?.trim() ||
                  `${nodeData.internalNodeCount ?? 0} internal steps`}
              </p>
              {nodeData.subRunProgress ? (
                <p className="mt-1 font-mono text-[10px] text-primary">
                  Running {nodeData.subRunProgress.completed}/
                  {nodeData.subRunProgress.total}
                </p>
              ) : null}
              {isError && nodeData.runResult?.error ? (
                <div className="mt-2">
                  <NodeErrorPanel
                    compact
                    error={nodeData.runResult.error}
                    errorCode={nodeData.runResult.errorCode}
                    errorContext={nodeData.runResult.errorContext}
                    nodeLabel={nodeData.pipelineName ?? nodeData.label}
                  />
                </div>
              ) : null}
            </div>

            <Handle
              type="source"
              position={Position.Right}
              id="output"
              className="!size-2.5 !border-2 !border-background !bg-primary"
            />
          </div>
        }
      />
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold">{nodeData.pipelineName ?? nodeData.label}</p>
        {nodeData.pipelineDescription ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {nodeData.pipelineDescription}
          </p>
        ) : null}
        <p className="mt-2 font-mono text-[10px]">
          {nodeData.internalNodeCount ?? 0} steps · {nodeData.inputType} →{" "}
          {nodeData.outputType}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
