"use client";

import type { ReactNode } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export type PipelineNodeVisualState = "idle" | "selected" | "running" | "error";

type PipelineNodeHeaderProps = {
  data: PipelineNodeData;
  visualState?: PipelineNodeVisualState;
  /** Trailing controls (clear / close). Output actions live in the node footer. */
  actions?: ReactNode;
};

export function PipelineNodeHeader({
  data,
  visualState = "idle",
  actions,
}: PipelineNodeHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-muted/10">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full transition-colors duration-150",
            visualState === "idle" && "bg-[var(--node-default)]",
            visualState === "selected" &&
              "bg-[var(--pulse)] shadow-[0_0_10px_color-mix(in_srgb,var(--pulse)_55%,transparent)]",
            visualState === "running" &&
              "animate-pulse bg-[var(--pulse)] shadow-[0_0_10px_color-mix(in_srgb,var(--pulse)_55%,transparent)]",
            visualState === "error" && "bg-destructive",
          )}
          aria-hidden
        />
        <ProviderLogo provider={data.provider} size={18} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground leading-tight">
            {data.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            {data.categoryLabel}
          </p>
        </div>
      </div>
      {actions && (
        <div className="ml-2 flex shrink-0 items-center gap-1.5">{actions}</div>
      )}
    </div>
  );
}
