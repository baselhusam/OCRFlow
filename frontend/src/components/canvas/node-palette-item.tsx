"use client";

import { GripVertical } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProviderLogo } from "@/components/canvas/provider-logo";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import { getModelWireTypes } from "@/lib/canvas/model-utils";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import {
  formatComputeTier,
  getModelDescription,
  getModelLabel,
} from "@/lib/canvas/model-utils";
import type { ModelCatalogEntry } from "@/lib/canvas/types";
import { DRAG_MODEL_MIME } from "@/lib/canvas/types";
import { requestPaletteAdd } from "@/lib/canvas/palette-add-bridge";
import { cn } from "@/lib/utils";

type NodePaletteItemProps = {
  model: ModelCatalogEntry;
  categoryColor?: string;
};

export function NodePaletteItem({
  model,
  categoryColor,
}: NodePaletteItemProps) {
  const wire = getModelWireTypes(model);
  const description = getModelDescription(model);
  const accent = categoryColor ?? "var(--border)";
  const { getModelStatus } = useRuntimeAvailability();
  const runtime = getModelStatus(model);
  const offline = runtime.offline;

  const handleDragStart = (event: React.DragEvent) => {
    if (offline) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(
      DRAG_MODEL_MIME,
      JSON.stringify({ type: "model", modelId: model.id }),
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleClick = () => {
    if (offline) return;
    requestPaletteAdd(model.id);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            draggable={!offline}
            onDragStart={handleDragStart}
            onClick={handleClick}
            aria-disabled={offline}
            data-offline={offline || undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-left",
              "focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
              offline
                ? "cursor-not-allowed opacity-70"
                : "cursor-grab transition-colors hover:border-border hover:bg-muted/45 active:cursor-grabbing",
            )}
            style={{ borderLeftWidth: 2.5, borderLeftColor: accent }}
            title={offline ? runtime.message : description}
          >
            <ProviderLogo
              provider={model.provider}
              size={24}
              className="shrink-0"
              status={offline ? "offline" : undefined}
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">
              {getModelLabel(model)}
            </span>
            {offline ? (
              <span className="shrink-0 rounded-md border border-[var(--status-warn)]/35 bg-[var(--status-warn)]/12 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-[0.08em] text-[var(--status-warn)] uppercase">
                offline
              </span>
            ) : (
              <GripVertical
                className="size-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
            )}
          </button>
        }
      />
      <TooltipContent side="right" align="start" className="max-w-xs">
        <div className="space-y-1.5">
          <p className="font-medium">{getModelLabel(model)}</p>
          {offline ? (
            <p className="font-medium text-background">{runtime.message}</p>
          ) : (
            <p className="text-background/80">{description}</p>
          )}
          <p className="font-mono text-[10px] text-background/70">
            {model.provider} · {formatComputeTier(model.compute)}
          </p>
          <p className="font-mono text-[10px] text-background/70">
            {formatWireLabel(wire.input)} → {formatWireLabel(wire.output)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
