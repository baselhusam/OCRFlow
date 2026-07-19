"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

import { getErrorDiagnosticMeta } from "@/lib/canvas/run-errors";
import type { NodeRunErrorCode, NodeRunErrorContext } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type NodeErrorPanelProps = {
  error: string;
  errorCode?: NodeRunErrorCode;
  errorContext?: NodeRunErrorContext;
  nodeLabel: string;
  compact?: boolean;
  className?: string;
};

export function NodeErrorPanel({
  error,
  errorCode,
  errorContext,
  nodeLabel,
  compact = false,
  className,
}: NodeErrorPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const meta = getErrorDiagnosticMeta(errorCode);

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-start gap-1.5 text-left"
        >
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 font-mono text-[8px] tracking-wide uppercase",
              meta.badgeClassName,
            )}
          >
            {meta.label}
          </span>
          <span className="min-w-0 flex-1 truncate text-[9px] text-destructive">
            {error}
          </span>
          {expanded ? (
            <ChevronUp className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          )}
        </button>

        {expanded ? (
          <NodeErrorPanelBody
            error={error}
            errorContext={errorContext}
            nodeLabel={nodeLabel}
            suggestion={meta.suggestion}
            compact
            className="mt-2"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/25 bg-destructive/5 p-3",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase",
            meta.badgeClassName,
          )}
        >
          {meta.label}
        </span>
        <span className="truncate text-[10px] font-medium text-foreground">
          {nodeLabel}
        </span>
      </div>

      <NodeErrorPanelBody
        error={error}
        errorContext={errorContext}
        nodeLabel={nodeLabel}
        suggestion={meta.suggestion}
      />
    </div>
  );
}

function NodeErrorPanelBody({
  error,
  errorContext,
  suggestion,
  compact = false,
  className,
}: {
  error: string;
  errorContext?: NodeRunErrorContext;
  nodeLabel: string;
  suggestion: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <pre
        className={cn(
          "max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/15 bg-background/80 px-2 py-1.5 font-mono text-destructive",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {error}
      </pre>

      {errorContext?.inputSummary ? (
        <p className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
          <span className="font-medium text-foreground/80">Input was:</span>{" "}
          {errorContext.inputSummary}
        </p>
      ) : null}

      <div
        className={cn(
          "flex items-start gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1.5",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        <Lightbulb className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="leading-snug text-muted-foreground">
          <span className="font-medium text-foreground/80">How to fix:</span>{" "}
          {suggestion}
        </p>
      </div>
    </div>
  );
}
