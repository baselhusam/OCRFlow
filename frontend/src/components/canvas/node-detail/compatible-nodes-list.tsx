"use client";

import { useMemo } from "react";
import { GripVertical } from "lucide-react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import { getCategoryColor } from "@/lib/canvas/category-meta";
import { getCompatibleDownstreamModels } from "@/lib/canvas/compatible-downstream-models";
import { getCompatibleUpstreamModels } from "@/lib/canvas/compatible-upstream-models";
import { getModelLabel } from "@/lib/canvas/model-utils";
import { requestPaletteAdd } from "@/lib/canvas/palette-add-bridge";
import type {
  CategoryMeta,
  ModelCatalogEntry,
  PipelineNodeData,
} from "@/lib/canvas/types";
import { DRAG_MODEL_MIME } from "@/lib/canvas/types";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { cn } from "@/lib/utils";

type CompatibleStepsPanelProps = {
  targetData: PipelineNodeData;
  sourceData: PipelineNodeData;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  showPreviousSteps: boolean;
};

type CompatibleEntry = {
  model: ModelCatalogEntry;
  categoryLabel: string;
  wireType: string;
};

type CompatibleNodeItemProps = {
  model: ModelCatalogEntry;
  categoryLabel: string;
  wireType: string;
  wireDirection: "in" | "out";
  categoryColor: string;
};

function CompatibleNodeItem({
  model,
  categoryLabel,
  wireType,
  wireDirection,
  categoryColor,
}: CompatibleNodeItemProps) {
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
    <li>
      <button
        type="button"
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        className={cn(
          "flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-2 text-left",
          "transition-colors hover:border-primary/30 hover:bg-muted/35 active:cursor-grabbing",
        )}
        style={{ borderLeftWidth: 2.5, borderLeftColor: categoryColor }}
        title={`Drag to canvas · ${wireDirection === "in" ? "accepts" : "sends"} ${formatWireLabel(wireType)}`}
      >
        <ProviderLogo provider={model.provider} size={22} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">
            {getModelLabel(model)}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[9px] text-muted-foreground">
            {categoryLabel} · {wireDirection === "in" ? "In" : "Out"}{" "}
            {formatWireLabel(wireType)}
          </span>
        </span>
        <GripVertical
          className="size-3.5 shrink-0 text-muted-foreground/45"
          aria-hidden
        />
      </button>
    </li>
  );
}

function CompatibleNodesSection({
  title,
  description,
  emptyMessage,
  compatible,
  wireDirection,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  compatible: CompatibleEntry[];
  wireDirection: "in" | "out";
}) {
  return (
    <section className="flex flex-col">
      <header className="mb-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
            {title}
          </h3>
          {compatible.length > 0 && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {compatible.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          {description}
        </p>
      </header>

      {compatible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {compatible.map((entry) => (
            <CompatibleNodeItem
              key={entry.model.id}
              model={entry.model}
              categoryLabel={entry.categoryLabel}
              wireType={entry.wireType}
              wireDirection={wireDirection}
              categoryColor={getCategoryColor(entry.model.category)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function CompatibleStepsPanel({
  targetData,
  sourceData,
  models,
  categories,
  showPreviousSteps,
}: CompatibleStepsPanelProps) {
  const upstreamCompatible = useMemo<CompatibleEntry[]>(() => {
    if (!showPreviousSteps) return [];
    return getCompatibleUpstreamModels(targetData, models, categories).map(
      ({ model, categoryLabel, outputType }) => ({
        model,
        categoryLabel,
        wireType: outputType,
      }),
    );
  }, [showPreviousSteps, targetData, models, categories]);

  const downstreamCompatible = useMemo<CompatibleEntry[]>(
    () =>
      getCompatibleDownstreamModels(sourceData, models, categories).map(
        ({ model, categoryLabel, inputType }) => ({
          model,
          categoryLabel,
          wireType: inputType,
        }),
      ),
    [sourceData, models, categories],
  );

  return (
    <div className="space-y-5 border-t border-border/50 pt-5">
      {showPreviousSteps && (
        <CompatibleNodesSection
          title="Add previous step"
          description="Drag onto the canvas or click to insert a node that can feed this input."
          emptyMessage="No compatible previous steps are available in the catalog for this input type."
          compatible={upstreamCompatible}
          wireDirection="out"
        />
      )}
      <CompatibleNodesSection
        title="Add next step"
        description="Drag onto the canvas or click to insert a compatible node."
        emptyMessage="No compatible next steps are available in the catalog for this output type."
        compatible={downstreamCompatible}
        wireDirection="in"
      />
    </div>
  );
}