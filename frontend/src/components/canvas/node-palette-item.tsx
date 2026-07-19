"use client";

import { GripVertical } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProviderLogo } from "@/components/canvas/provider-logo";
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

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData(
      DRAG_MODEL_MIME,
      JSON.stringify({ type: "model", modelId: model.id }),
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleClick = () => {
    requestPaletteAdd(model.id);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            draggable
            onDragStart={handleDragStart}
            onClick={handleClick}
            className={cn(
              "flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-left",
              "transition-colors hover:bg-muted/40 active:cursor-grabbing",
            )}
            style={{ borderLeftWidth: 2.5, borderLeftColor: accent }}
            title={description}
          >
            <ProviderLogo
              provider={model.provider}
              size={24}
              className="shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">
              {getModelLabel(model)}
            </span>
            <GripVertical
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
          </button>
        }
      />
      <TooltipContent side="right" align="start" className="max-w-xs">
        <div className="space-y-1.5">
          <p className="font-medium">{getModelLabel(model)}</p>
          <p className="text-background/80">{description}</p>
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
