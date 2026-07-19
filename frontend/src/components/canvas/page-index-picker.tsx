"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  displayToPageIndex,
  pageIndexToDisplay,
} from "@/lib/canvas/page-index-display";
import { cn } from "@/lib/utils";

type PageIndexPickerProps = {
  /** 0-based page index stored on the node. */
  value: number;
  onChange: (pageIndex: number) => void;
  pageCount?: number;
  variant?: "compact" | "default";
  className?: string;
};

function clampPageIndex(value: number, maxIndex: number | null): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (maxIndex === null) return Math.max(0, rounded);
  return Math.min(Math.max(0, rounded), maxIndex);
}

export function PageIndexPicker({
  value,
  onChange,
  pageCount = 0,
  variant = "default",
  className,
}: PageIndexPickerProps) {
  const isCompact = variant === "compact";
  const maxIndex = pageCount > 0 ? pageCount - 1 : null;
  const clampedIndex = clampPageIndex(value, maxIndex);
  const displayValue = pageIndexToDisplay(clampedIndex);
  const minDisplay = pageIndexToDisplay(0);
  const maxDisplay = maxIndex === null ? null : pageIndexToDisplay(maxIndex);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (maxIndex !== null && clampedIndex !== value) {
      onChange(clampedIndex);
    }
  }, [clampedIndex, maxIndex, onChange, value]);

  const inputValue = draft ?? String(displayValue);
  const canDecrement = clampedIndex > 0;
  const canIncrement = maxIndex === null || clampedIndex < maxIndex;

  const commitIndex = (nextIndex: number) => {
    const clamped = clampPageIndex(nextIndex, maxIndex);
    setDraft(null);
    onChange(clamped);
  };

  const handleInputChange = (raw: string) => {
    setDraft(raw);
    if (raw === "" || raw === "-") return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      onChange(clampPageIndex(displayToPageIndex(parsed), maxIndex));
    }
  };

  const handleBlur = () => {
    setDraft(null);
    onChange(clampedIndex);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono tracking-[0.1em] text-muted-foreground uppercase",
            isCompact ? "text-[9px]" : "text-[10px]",
          )}
        >
          Page number
        </span>
        {pageCount > 0 ? (
          <span className="font-mono text-[9px] text-muted-foreground/80">
            {pageCount} available · {minDisplay}–{maxDisplay}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "nodrag nopan flex items-stretch overflow-hidden rounded-md border border-input bg-background",
          isCompact ? "h-7" : "h-8",
        )}
      >
        <button
          type="button"
          disabled={!canDecrement}
          onClick={() => commitIndex(clampedIndex - 1)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center border-r border-input text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
            isCompact ? "w-7" : "w-8",
          )}
          aria-label="Previous page"
        >
          <Minus className={isCompact ? "size-3" : "size-3.5"} strokeWidth={2.5} />
        </button>

        <input
          type="number"
          min={minDisplay}
          max={maxDisplay ?? undefined}
          step={1}
          inputMode="numeric"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={handleBlur}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent text-center font-mono text-foreground outline-none focus-visible:ring-0",
            isCompact ? "text-xs" : "text-sm",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
          aria-label="Page number"
        />

        <button
          type="button"
          disabled={!canIncrement}
          onClick={() => commitIndex(clampedIndex + 1)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
            isCompact ? "w-7" : "w-8",
          )}
          aria-label="Next page"
        >
          <Plus className={isCompact ? "size-3" : "size-3.5"} strokeWidth={2.5} />
        </button>
      </div>

      {pageCount === 0 && (
        <p className="text-[9px] leading-snug text-muted-foreground">
          Connect a page source upstream to validate the page number.
        </p>
      )}
    </div>
  );
}
