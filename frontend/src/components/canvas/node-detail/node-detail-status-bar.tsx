"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import { getNodeReadiness } from "@/lib/canvas/node-readiness";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type NodeDetailStatusBarProps = {
  data: PipelineNodeData;
  upstream: UpstreamContext;
};

export function NodeDetailStatusBar({
  data,
  upstream,
}: NodeDetailStatusBarProps) {
  const { projectId } = usePipelineGraphActions();
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const readiness = getNodeReadiness(data.modelId, data, upstream, projectId);
  const planned = isPlannedNode(data.modelId, data.category);
  const issueCount = readiness.issues.length;

  return (
    <div className="border-b border-border px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {planned ? (
          <span className="inline-flex items-center gap-1 rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] tracking-wide text-amber-700 uppercase dark:text-amber-400">
            <Clock className="size-3" />
            Planned
          </span>
        ) : readiness.ready ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3" />
            Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-3" />
            Not ready
          </span>
        )}

        {data.runStatus === "running" && (
          <span className="font-mono text-[10px] text-muted-foreground">
            Running…
          </span>
        )}
        {data.runStatus === "success" && (
          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            Succeeded
          </span>
        )}
        {data.runStatus === "error" && (
          <button
            type="button"
            onClick={() => setErrorOpen((value) => !value)}
            className="inline-flex items-center gap-1 rounded-sm border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[9px] text-destructive"
          >
            Failed
            {errorOpen ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
        )}

        {data.lastRunAt && (
          <span className="font-mono text-[9px] text-muted-foreground">
            {new Date(data.lastRunAt).toLocaleString()}
          </span>
        )}

        {!readiness.ready && issueCount > 0 && (
          <button
            type="button"
            onClick={() => setIssuesOpen((v) => !v)}
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-400",
            )}
          >
            {issueCount} issue{issueCount === 1 ? "" : "s"}
            {issuesOpen ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
        )}
      </div>

      {errorOpen && data.runResult?.error ? (
        <div className="mt-2 border-t border-border/60 pt-2">
          <NodeErrorPanel
            error={data.runResult.error}
            errorCode={data.runResult.errorCode}
            errorContext={data.runResult.errorContext}
            nodeLabel={data.label}
          />
        </div>
      ) : null}

      {issuesOpen && issueCount > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2">
          {readiness.issues.map((issue) => (
            <li key={issue} className="text-[10px] leading-snug text-muted-foreground">
              · {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
