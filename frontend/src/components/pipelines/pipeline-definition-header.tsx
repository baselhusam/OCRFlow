"use client";

import Link from "next/link";
import {
  ChevronRight,
  LayoutGrid,
  Loader2,
  Play,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CanvasToast } from "@/components/canvas/canvas-toast";
import { CommandPalette } from "@/components/app/command-palette";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  canvasStatusDotClassName,
  canvasTopBarClassName,
} from "@/lib/canvas/canvas-chrome";
import type { PipelineBoundaryResult } from "@/lib/canvas/pipeline-boundary";
import {
  formatBoundaryErrors,
  getPipelineBoundaryStatusLabel,
} from "@/lib/pipelines/boundary-labels";
import { RelativeTime } from "@/components/relative-time";
import { formatShortDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type PipelineDefinitionHeaderProps = {
  pipelineName: string;
  boundaryValidation: PipelineBoundaryResult | null;
  saveValidationError: string | null;
  readOnly?: boolean;
};

export function PipelineDefinitionHeader({
  pipelineName,
  boundaryValidation,
  saveValidationError,
  readOnly = false,
}: PipelineDefinitionHeaderProps) {
  const router = useRouter();
  const {
    nodes,
    edges,
    saveStatus,
    lastSavedAt,
    hasUnsavedChanges,
    saveNow,
    autoLayout,
    projectId,
    entity,
  } = usePipelineGraphActions();

  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error" | "info";
  } | null>(null);

  const isSaving = saveStatus === "saving";
  const boundaryStatus = getPipelineBoundaryStatusLabel(boundaryValidation);
  const saveFailed = saveStatus === "error";

  const saveLabel = isSaving
    ? "Saving…"
    : saveStatus === "error"
      ? "Retry save"
      : "Save";

  const saveTitle = isSaving
    ? "Saving pipeline definition"
    : hasUnsavedChanges
      ? "Save unsaved changes"
      : lastSavedAt
        ? `Last saved ${formatShortDateTime(lastSavedAt)}`
        : "Save pipeline";

  const handleApply = useCallback(async () => {
    const pipelineId =
      entity?.kind === "pipeline" ? entity.id : projectId;
    if (!pipelineId) return;
    if (hasUnsavedChanges && !readOnly) {
      const saved = await saveNow();
      if (!saved) {
        setToast({
          message:
            saveValidationError ??
            "Save the pipeline before applying it to documents.",
          variant: "error",
        });
        return;
      }
    }
    router.push(`/app/jobs/new?pipeline=${pipelineId}`);
  }, [
    entity,
    hasUnsavedChanges,
    projectId,
    readOnly,
    router,
    saveNow,
    saveValidationError,
  ]);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    const saved = await saveNow();
    setToast(
      saved
        ? { message: "Pipeline saved successfully.", variant: "success" }
        : {
            message:
              saveValidationError ??
              "Failed to save pipeline. Check that the flow has valid input and output.",
            variant: "error",
          },
    );
  }, [readOnly, saveNow, saveValidationError]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        if (!isSaving && !readOnly) void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, isSaving, readOnly]);

  return (
    <>
      {toast ? (
        <CanvasToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <header
        className={cn(
          canvasTopBarClassName,
          "min-w-0 gap-4 overflow-hidden px-4 md:px-[18px]",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2.5 overflow-hidden"
          >
            <Link
              href="/app/pipelines"
              className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pipelines
            </Link>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
            <span
              className="min-w-0 truncate text-sm font-semibold text-foreground/80"
              title={pipelineName}
            >
              {pipelineName}
            </span>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
            <span className="shrink-0 text-sm font-bold tracking-tight text-foreground">
              Canvas
            </span>
          </nav>

          <div className="hidden shrink-0 items-center gap-[18px] font-mono text-[11px] tracking-[0.04em] text-muted-foreground xl:flex">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                canvasStatusDotClassName,
                boundaryStatus.tone === "ready"
                  ? "bg-emerald-500"
                  : boundaryStatus.tone === "invalid"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "max-w-[280px] truncate",
                boundaryStatus.tone === "ready" && "text-emerald-700 dark:text-emerald-400",
                boundaryStatus.tone === "invalid" && "text-amber-700 dark:text-amber-400",
              )}
              title={boundaryStatus.label}
            >
              {boundaryStatus.label}
            </span>
          </span>
          {saveFailed && saveValidationError ? (
            <span
              className="max-w-[220px] truncate text-amber-700 dark:text-amber-400"
              title={formatBoundaryErrors(saveValidationError.split(", "))}
            >
              Save failed:{" "}
              {formatBoundaryErrors(saveValidationError.split(", "))}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                canvasStatusDotClassName,
                hasUnsavedChanges && !isSaving
                  ? "bg-amber-500"
                  : "bg-emerald-500",
              )}
              aria-hidden
            />
            <span>
              {isSaving ? "Saving…" : lastSavedAt ? "Saved " : "Not saved"}
              {!isSaving && lastSavedAt ? (
                <RelativeTime value={lastSavedAt} refreshMs={5_000} />
              ) : null}
            </span>
          </span>
          <span className="hidden text-muted-foreground/70 2xl:inline">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
            {edges.length > 0 ? ` · ${edges.length} wires` : ""}
          </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CommandPalette compact />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={autoLayout}
                  disabled={readOnly || nodes.length === 0}
                />
              }
            >
              <LayoutGrid className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Auto layout</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={
                    readOnly || isSaving || (!hasUnsavedChanges && !saveFailed)
                  }
                  onClick={() => void handleSave()}
                />
              }
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saveLabel}
            </TooltipTrigger>
            <TooltipContent>{saveTitle}</TooltipContent>
          </Tooltip>

          {boundaryValidation?.valid ? (
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5 rounded-lg text-[13px] font-semibold"
              onClick={() => void handleApply()}
            >
              <Play className="size-3.5" />
              Apply
            </Button>
          ) : null}

          <ThemeToggle />
        </div>
      </header>
    </>
  );
}
