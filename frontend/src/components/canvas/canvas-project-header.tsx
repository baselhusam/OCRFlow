"use client";

import Link from "next/link";
import {
  ChevronRight,
  GitBranch,
  LayoutGrid,
  Loader2,
  LocateFixed,
  PanelLeft,
  Play,
  RotateCcw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CanvasToast } from "@/components/canvas/canvas-toast";
import { BatchDocumentsDialog } from "@/components/canvas/batch-documents-dialog";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { NodePalettePanel } from "@/components/canvas/node-palette-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CANVAS_PALETTE_WIDTH,
  canvasBreadcrumbChipClassName,
  canvasStatusDotClassName,
  canvasTopBarClassName,
} from "@/lib/canvas/canvas-chrome";
import { filterDoneModels } from "@/lib/canvas/model-utils";
import type { CategoryMeta, ModelCatalogEntry } from "@/lib/canvas/types";
import { RelativeTime } from "@/components/relative-time";
import { formatShortDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type CanvasProjectHeaderProps = {
  projectName: string;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  userPipelines?: import("@/lib/api/client").Pipeline[];
  readOnly?: boolean;
};

function HeaderDivider() {
  return (
    <span
      className="hidden h-6 w-px shrink-0 bg-border lg:block"
      aria-hidden
    />
  );
}

export function CanvasProjectHeader({
  projectName,
  models,
  categories,
  userPipelines = [],
  readOnly = false,
}: CanvasProjectHeaderProps) {
  const {
    nodes,
    edges,
    selectedNodeId,
    saveStatus,
    lastSavedAt,
    hasUnsavedChanges,
    saveNow,
    runFullPipeline,
    clearAllRunState,
    pipelineRunState,
    pipelineSteps,
    focusNode,
    autoLayout,
    projectId,
    entity,
  } = usePipelineGraphActions();

  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error" | "info";
  } | null>(null);
  const [blockerIndex, setBlockerIndex] = useState(0);

  const doneModels = filterDoneModels(models);
  const isSaving = saveStatus === "saving";
  const isRunning = pipelineRunState.status === "running";
  const readySteps = pipelineSteps.filter((step) => step.ready).length;
  const canRun = nodes.length > 0 && readySteps === pipelineSteps.length;

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedData = selectedNode?.data;

  const failedNode = pipelineRunState.failedNodeId
    ? nodes.find((node) => node.id === pipelineRunState.failedNodeId)
    : null;
  const failedRunResult = failedNode?.data.runResult;

  const blockers = useMemo(
    () => pipelineSteps.filter((step) => !step.ready),
    [pipelineSteps],
  );

  const blockerSignature = blockers
    .map((step) => `${step.nodeId}:${step.issues.join("|")}`)
    .join(";");

  useEffect(() => {
    setBlockerIndex(0);
  }, [blockerSignature]);

  const activeBlocker =
    blockers.length > 0
      ? blockers[blockerIndex % blockers.length]
      : null;

  const runBlockers = useMemo(() => {
    if (!nodes.length) return ["Add nodes to the canvas first"];
    return pipelineSteps
      .filter((step) => !step.ready)
      .flatMap((step) =>
        step.issues.map((issue) => `${step.label}: ${issue}`),
      );
  }, [nodes.length, pipelineSteps]);

  const runIsDisabled = readOnly || !canRun || isRunning;

  const hasAnyRunState = nodes.some(
    (n) =>
      n.data.cachedOutput != null ||
      (n.data.runStatus != null && n.data.runStatus !== "idle"),
  );

  const saveLabel = isSaving
    ? "Saving…"
    : saveStatus === "error"
      ? "Retry save"
      : "Save";

  const saveTitle = isSaving
    ? "Saving pipeline to project"
    : hasUnsavedChanges
      ? "Save unsaved changes"
      : lastSavedAt
        ? `Last saved ${formatShortDateTime(lastSavedAt)}`
        : "Save pipeline";

  const savedStatusText = isSaving
    ? "Saving…"
    : lastSavedAt
      ? `Saved `
      : "Not saved";

  const runStatusText = isRunning
    ? "Running…"
    : pipelineRunState.lastRunAt
      ? `Last run `
      : "Never run";

  const runTitle = isRunning
    ? `Running pipeline (${pipelineRunState.completedCount + 1}/${pipelineRunState.totalCount})`
    : canRun
      ? "Run all nodes in dependency order"
      : "Cannot run yet";

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    const saved = await saveNow();
    setToast(
      saved
        ? { message: "Project saved successfully.", variant: "success" }
        : {
            message: "Failed to save project. Please try again.",
            variant: "error",
          },
    );
  }, [readOnly, saveNow]);

  const handleGoToBlocker = useCallback(() => {
    if (!activeBlocker) return;

    focusNode(activeBlocker.nodeId);

    const issue = activeBlocker.issues[0] ?? "Needs attention";
    const blockerPosition = blockers.findIndex(
      (step) => step.nodeId === activeBlocker.nodeId,
    );
    const cycleHint =
      blockers.length > 1
        ? ` (${blockerPosition + 1} of ${blockers.length} blockers — click again for the next)`
        : "";

    setToast({
      message: `Selected "${activeBlocker.label}" on canvas — ${issue}${cycleHint}`,
      variant: "info",
    });

    if (blockers.length > 1) {
      setBlockerIndex((current) => (current + 1) % blockers.length);
    }
  }, [activeBlocker, blockers, focusNode]);

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
              href="/app/projects"
              className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Projects
            </Link>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
            <span
              className="min-w-0 truncate text-sm font-semibold text-foreground/80"
              title={projectName}
            >
              {projectName}
            </span>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
            {selectedData ? (
              <span
                className={cn(
                  canvasBreadcrumbChipClassName,
                  "min-w-0 max-w-[14rem] shrink",
                )}
                style={{
                  backgroundColor: `color-mix(in srgb, ${selectedData.categoryColor} 12%, var(--card))`,
                  borderColor: `color-mix(in srgb, ${selectedData.categoryColor} 35%, var(--border))`,
                }}
                title={selectedData.label}
              >
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: selectedData.categoryColor }}
                  aria-hidden
                />
                <span className="truncate text-foreground">
                  {selectedData.label}
                </span>
              </span>
            ) : (
              <span className="shrink-0 text-sm font-bold tracking-tight text-foreground">
                Canvas
              </span>
            )}
          </nav>

          <div className="hidden shrink-0 items-center gap-[18px] font-mono text-[11px] tracking-[0.04em] text-muted-foreground xl:flex">
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
              {savedStatusText}
              {!isSaving && lastSavedAt ? (
                <RelativeTime value={lastSavedAt} refreshMs={5_000} />
              ) : null}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                canvasStatusDotClassName,
                isRunning
                  ? "animate-pulse bg-amber-500"
                  : pipelineRunState.lastRunStatus === "error"
                    ? "bg-destructive"
                    : pipelineRunState.lastRunStatus === "success"
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            <span>
              {runStatusText}
              {!isRunning && pipelineRunState.lastRunAt ? (
                <RelativeTime
                  value={pipelineRunState.lastRunAt}
                  refreshMs={5_000}
                />
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
          <div className="flex items-center gap-1.5 lg:hidden">
            {hasUnsavedChanges && !isSaving ? (
              <span
                className="size-1.5 shrink-0 rounded-full bg-amber-500"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              />
            ) : null}
          </div>

          <HeaderDivider />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden h-9 rounded-lg sm:inline-flex"
                  disabled={readOnly || nodes.length === 0}
                  onClick={() => autoLayout()}
                />
              }
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden text-[13px] font-semibold lg:inline">
                Layout
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Auto-arrange nodes left to right
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg border-border text-[13px] font-semibold"
                  disabled={readOnly || isSaving}
                  onClick={() => void handleSave()}
                />
              }
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span className="hidden sm:inline">{saveLabel}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {saveTitle}
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                ⌘S
              </span>
            </TooltipContent>
          </Tooltip>

          {!readOnly && !canRun && nodes.length > 0 ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden h-9 max-w-[11rem] rounded-lg border-amber-500/25 bg-amber-500/5 text-[13px] font-semibold text-amber-900 hover:bg-amber-500/10 hover:text-amber-950 sm:inline-flex dark:text-amber-100 dark:hover:text-amber-50"
                    onClick={handleGoToBlocker}
                  />
                }
              >
                <LocateFixed className="size-3.5 shrink-0" />
                <span className="hidden truncate md:inline">Select blocker</span>
                <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-px font-mono text-[10px] text-amber-900/90 dark:text-amber-100/90">
                  {blockers.length}/{pipelineSteps.length}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <span className="font-medium">
                  {readySteps} of {pipelineSteps.length} nodes ready to run
                </span>
                {activeBlocker ? (
                  <span className="mt-1.5 block text-[10px] text-muted-foreground">
                    Next: {activeBlocker.label} —{" "}
                    {activeBlocker.issues[0] ?? "Needs attention"}
                  </span>
                ) : null}
              </TooltipContent>
            </Tooltip>
          ) : null}

          {!readOnly && hasAnyRunState && !isRunning ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg border-border text-[13px] font-semibold text-muted-foreground hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive"
                    onClick={() => clearAllRunState()}
                  />
                }
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Clear all</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Un-run all nodes and clear all cached outputs
              </TooltipContent>
            </Tooltip>
          ) : null}

          {entity?.kind === "project" ? (
            <BatchDocumentsDialog
              projectId={projectId}
              disabled={readOnly || isRunning}
              hasFileLoader={nodes.some(
                (n) =>
                  n.data.modelId === "loader/pdf" ||
                  n.data.modelId === "loader/image",
              )}
            />
          ) : null}

          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    "inline-flex",
                    runIsDisabled && "cursor-not-allowed",
                  )}
                >
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-9 rounded-lg bg-primary px-[18px] text-[13px] font-semibold text-primary-foreground shadow-[0_8px_20px_-10px_var(--pulse)] hover:bg-primary/90"
                    disabled={runIsDisabled}
                    onClick={() => void runFullPipeline()}
                  >
                    {isRunning ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5 fill-current" />
                    )}
                    <span className="hidden sm:inline">
                      {isRunning ? "Running…" : "Run"}
                    </span>
                  </Button>
                </span>
              }
            />
            <TooltipContent side="bottom" className="max-w-xs">
              <span className="font-medium">{runTitle}</span>
              {isRunning ? (
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {pipelineRunState.completedCount + 1} of{" "}
                  {pipelineRunState.totalCount} nodes
                </span>
              ) : canRun ? (
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  ⌘↵
                </span>
              ) : (
                <ul className="mt-1.5 space-y-1 text-[10px] text-muted-foreground">
                  {runBlockers.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </TooltipContent>
          </Tooltip>

          {pipelineRunState.status === "success" && !isRunning ? (
            <div
              className="hidden items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1.5 lg:flex"
              title="Last pipeline run completed successfully"
            >
              <GitBranch className="size-3 text-muted-foreground" aria-hidden />
              <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
                Complete
              </span>
            </div>
          ) : null}

          {pipelineRunState.status === "error" && pipelineRunState.error ? (
            <Popover>
              <PopoverTrigger
                className="max-w-[8rem] truncate rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[10px] text-destructive sm:max-w-[10rem]"
                title={pipelineRunState.error}
              >
                Pipeline failed
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                className="w-[320px] p-3"
              >
                <p className="mb-2 text-xs font-semibold text-foreground">
                  Pipeline run failed
                  {pipelineRunState.failedNodeLabel ? (
                    <>
                      {" "}
                      at &ldquo;{pipelineRunState.failedNodeLabel}&rdquo;
                    </>
                  ) : null}
                </p>
                <NodeErrorPanel
                  error={pipelineRunState.error}
                  errorCode={
                    pipelineRunState.errorCode ?? failedRunResult?.errorCode
                  }
                  errorContext={failedRunResult?.errorContext}
                  nodeLabel={
                    pipelineRunState.failedNodeLabel ??
                    failedNode?.data.label ??
                    "Node"
                  }
                />
                {pipelineRunState.failedNodeId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 h-8 w-full"
                    onClick={() => focusNode(pipelineRunState.failedNodeId!)}
                  >
                    <LocateFixed className="mr-1.5 size-3.5" />
                    Go to node
                  </Button>
                ) : null}
              </PopoverContent>
            </Popover>
          ) : null}

          <ThemeToggle />

          {!readOnly ? <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg md:hidden"
                />
              }
            >
              <PanelLeft className="size-3.5" />
              <span className="sr-only">Open model library</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex flex-col p-0 sm:max-w-none"
              style={{ width: CANVAS_PALETTE_WIDTH }}
            >
              <SheetHeader className="border-b border-border/80 px-3 py-2.5">
                <SheetTitle className="text-xs font-normal text-muted-foreground">
                  Model library
                </SheetTitle>
              </SheetHeader>
              <NodePalettePanel
                models={doneModels}
                categories={categories}
                paletteMode={
                  entity?.kind === "pipeline" ? "pipeline" : "project"
                }
                userPipelines={
                  entity?.kind === "project" ? userPipelines : undefined
                }
                className="min-h-0 w-full flex-1 border-r-0"
                showHeader={false}
                showBrandBar={false}
              />
            </SheetContent>
          </Sheet> : null}
        </div>
      </header>
    </>
  );
}
