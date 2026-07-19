"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { NodePalettePanel } from "@/components/canvas/node-palette-panel";
import { PipelineCanvas } from "@/components/canvas/pipeline-canvas";
import { TooltipProvider } from "@/components/ui/tooltip";
import { filterDoneModels } from "@/lib/canvas/model-utils";
import {
  readPaletteCollapsed,
  writePaletteCollapsed,
} from "@/lib/canvas/palette-prefs";
import { BLOCKED_PIPELINE_MODELS } from "@/lib/canvas/wire-types";
import type { CategoryMeta, ModelCatalogEntry } from "@/lib/canvas/types";

type CanvasShellProps = {
  entity: import("@/lib/canvas/types").GraphEntityContext;
  entityName: string;
  entityUpdatedAt: string;
  initialGraph: Record<string, unknown>;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  readOnly?: boolean;
  userPipelines?: import("@/lib/api/client").Pipeline[];
};

export function CanvasShell({
  entity,
  entityName,
  entityUpdatedAt,
  initialGraph,
  models,
  categories,
  readOnly = false,
  userPipelines = [],
}: CanvasShellProps) {
  const doneModels = filterDoneModels(models);
  const paletteModels = useMemo(() => {
    if (entity.kind === "pipeline") {
      return doneModels.filter((model) => !BLOCKED_PIPELINE_MODELS.has(model.id));
    }
    return doneModels;
  }, [doneModels, entity.kind]);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  useEffect(() => {
    setPaletteCollapsed(readPaletteCollapsed());
  }, []);

  const handlePaletteCollapsedChange = useCallback((collapsed: boolean) => {
    setPaletteCollapsed(collapsed);
    writePaletteCollapsed(collapsed);
  }, []);

  return (
    <TooltipProvider delay={400}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative flex min-h-0 flex-1">
          {!readOnly ? (
            <div className="hidden shrink-0 md:flex">
              <NodePalettePanel
                models={paletteModels}
                categories={categories}
                paletteMode={entity.kind === "pipeline" ? "pipeline" : "project"}
                userPipelines={
                  entity.kind === "project" ? userPipelines : undefined
                }
                collapsed={paletteCollapsed}
                onCollapsedChange={handlePaletteCollapsedChange}
              />
            </div>
          ) : null}
          <div className="relative min-h-0 min-w-0 flex-1">
            <PipelineCanvas
              entity={entity}
              entityName={entityName}
              entityUpdatedAt={entityUpdatedAt}
              initialGraph={initialGraph}
              models={paletteModels}
              categories={categories}
              readOnly={readOnly}
              userPipelines={userPipelines}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
