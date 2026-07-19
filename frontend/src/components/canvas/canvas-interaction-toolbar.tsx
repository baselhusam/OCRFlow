"use client";

import { Hand, MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CanvasInteractionMode } from "@/lib/canvas/canvas-interaction-prefs";
import { cn } from "@/lib/utils";

type CanvasInteractionToolbarProps = {
  mode: CanvasInteractionMode;
  onModeChange: (mode: CanvasInteractionMode) => void;
};

export function CanvasInteractionToolbar({
  mode,
  onModeChange,
}: CanvasInteractionToolbarProps) {
  return (
    <TooltipProvider delay={400}>
      <div className="ocrflow-canvas-interaction-toolbar flex gap-0.5 rounded-[10px] border border-border bg-card p-1 shadow-[0_4px_14px_-6px_color-mix(in_srgb,var(--foreground)_18%,transparent)]">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-pressed={mode === "select"}
                  aria-label="Select tool"
                  className={cn(
                    "size-[30px] rounded-[7px]",
                    mode === "select" &&
                      "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground",
                  )}
                  onClick={() => onModeChange("select")}
                />
              }
            >
              <MousePointer2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">
              Select <span className="text-background/60">(V)</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-pressed={mode === "pan"}
                  aria-label="Pan tool"
                  className={cn(
                    "size-[30px] rounded-[7px]",
                    mode === "pan" &&
                      "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground",
                  )}
                  onClick={() => onModeChange("pan")}
                />
              }
            >
              <Hand className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">
              Pan <span className="text-background/60">(H)</span>
            </TooltipContent>
          </Tooltip>
      </div>
    </TooltipProvider>
  );
}
