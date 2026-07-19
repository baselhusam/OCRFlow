"use client";

import { Eye, LayoutPanelTop } from "lucide-react";
import type { ReactNode } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export type PipelineNodeVisualState = "idle" | "selected" | "running" | "error";

type PipelineNodeHeaderProps = {
  data: PipelineNodeData;
  visualState?: PipelineNodeVisualState;
  showOutputToggle?: boolean;
  outputToggleVariant?: "panel" | "preview";
  outputOpen?: boolean;
  outputItemCount?: number;
  onToggleOutput?: () => void;
  actions?: ReactNode;
};

export function PipelineNodeHeader({
  data,
  visualState = "idle",
  showOutputToggle = false,
  outputToggleVariant = "panel",
  outputOpen = false,
  outputItemCount = 0,
  onToggleOutput,
  actions,
}: PipelineNodeHeaderProps) {
  const OutputToggleIcon =
    outputToggleVariant === "preview" ? Eye : LayoutPanelTop;
  const outputToggleLabel =
    outputToggleVariant === "preview"
      ? outputOpen
        ? "Hide preview"
        : "Preview classification results"
      : outputOpen
        ? "Hide output"
        : "Show output";

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
          <p className="truncate text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">
            {data.categoryLabel}
          </p>
        </div>
      </div>
      {(showOutputToggle || actions) && (
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {showOutputToggle && (
            <button
              type="button"
              onClick={onToggleOutput}
              aria-label={outputToggleLabel}
              aria-pressed={outputOpen}
              className={cn(
                "nodrag nopan relative flex size-6 items-center justify-center rounded-md border transition-all duration-200",
                outputOpen
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)] shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]"
                  : "border-border/60 bg-background text-muted-foreground hover:border-muted-foreground/40 hover:bg-secondary/40 hover:text-foreground",
              )}
            >
              <OutputToggleIcon className="size-3" strokeWidth={1.75} />
              {outputItemCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 flex min-w-[14px] items-center justify-center rounded-full px-0.5 font-mono text-[8px] leading-none border border-background",
                    outputOpen
                      ? "bg-[var(--primary)] text-white"
                      : "bg-secondary text-foreground/70",
                  )}
                >
                  {outputItemCount > 99 ? "99+" : outputItemCount}
                </span>
              )}
            </button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
