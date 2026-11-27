"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDot,
  Download,
  Eraser,
  Files,
  GitBranch,
  Keyboard,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Moon,
  Play,
  PlayCircle,
  Square,
  Sun,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CommandPalette } from "@/components/app/command-palette";
import { BatchDocumentsDialog } from "@/components/canvas/batch-documents-dialog";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useEditorUi } from "@/components/flow-editor/editor-ui-context";
import { formatDuration, isRunCancelled } from "@/components/flow-editor/node-status";
import { CreatePipelineFromCanvasDialog } from "@/components/pipelines/create-pipeline-from-canvas-dialog";
import { useTheme } from "@/components/providers/theme-provider";
import { RelativeTime } from "@/components/relative-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateProject } from "@/lib/api/projects";
import { serializePipelineGraph } from "@/lib/canvas/graph-utils";
import { OPEN_SHORTCUTS_EVENT, shortcutLabel } from "@/lib/keyboard-shortcuts";
import type { PipelineBoundaryResult } from "@/lib/canvas/pipeline-boundary";
import { cn } from "@/lib/utils";

type TopBarProps = {
  projectName: string;
  onStopRun: () => void;
  backHref: string;
  backLabel: string;
  /** Pipeline-definition canvases: entry/exit validation. */
  boundary?: PipelineBoundaryResult | null;
  saveValidationError?: string | null;
};

function useTicker(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function ProjectName({ name, projectId, readOnly }: { name: string; projectId: string; readOnly: boolean }) {
  const [value, setValue] = useState(name);
  const [editing, setEditing] = useState(false);
  const saved = useRef(name);
  const router = useRouter();

  const commit = async () => {
    setEditing(false);
    const next = value.trim();
    if (!next || next === saved.current) {
      setValue(saved.current);
      return;
    }
    try {
      await updateProject(projectId, { name: next });
      saved.current = next;
      document.title = `${next} · Canvas — OCRFlow`;
      router.refresh();
    } catch {
      setValue(saved.current);
    }
  };

  if (editing && !readOnly) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") void commit();
          if (event.key === "Escape") {
            setValue(saved.current);
            setEditing(false);
          }
        }}
        className="h-8 w-[min(320px,40vw)] rounded-md border border-primary bg-background px-2 text-[14px] font-semibold outline-none ring-3 ring-primary/20"
        aria-label="Project name"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => !readOnly && setEditing(true)}
      title={readOnly ? value : "Rename project"}
      className={cn(
        "max-w-[min(320px,32vw)] truncate rounded-md px-1.5 py-1 text-[14px] font-semibold tracking-[-0.01em] text-foreground",
        !readOnly && "hover:bg-foreground/[0.06]",
      )}
    >
      {value}
    </button>
  );
}

function SaveState() {
  const { saveStatus, hasUnsavedChanges, lastSavedAt } = usePipelineGraphActions();
  if (saveStatus === "saving") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--primary-text,var(--primary))]">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (saveStatus === "error") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-destructive">
        <XCircle className="size-3" /> Not saved
      </span>
    );
  }
  if (hasUnsavedChanges) {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--status-warn)]">
        <CircleDot className="size-3" /> Unsaved
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:flex">
      <Check className="size-3 text-[var(--status-ok)]" />
      Saved
      {lastSavedAt ? (
        <>
          {" · "}
          <RelativeTime value={lastSavedAt} />
        </>
      ) : null}
    </span>
  );
}

export function TopBar({
  projectName,
  onStopRun,
  backHref,
  backLabel,
  boundary,
  saveValidationError,
}: TopBarProps) {
  const graph = usePipelineGraphActions();
  const ui = useEditorUi();
  const { resolvedTheme, setTheme } = useTheme();
  const [batchOpen, setBatchOpen] = useState(false);
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const run = graph.pipelineRunState;
  const isRunning = run.status === "running";
  const now = useTicker(isRunning);
  const isProject = graph.entity?.kind !== "pipeline";

  const blockers = useMemo(
    () => graph.pipelineSteps.filter((step) => !step.ready),
    [graph.pipelineSteps],
  );
  const canRun = graph.nodes.length > 0 && blockers.length === 0;
  // The run state only names the current node once the server reports it; fall
  // back to the step the editor already shows as running (e.g. the loader).
  const currentNode =
    (run.currentNodeId ? graph.nodes.find((node) => node.id === run.currentNodeId) : null) ??
    graph.nodes.find((node) => ui.fullRunNodeStates.get(node.id) === "running") ??
    null;
  const selectedNode = graph.selectedNodeId
    ? graph.nodes.find((node) => node.id === graph.selectedNodeId)
    : null;

  const [blockerCursor, setBlockerCursor] = useState(0);
  const goToBlocker = () => {
    if (!blockers.length) return;
    const step = blockers[blockerCursor % blockers.length];
    setBlockerCursor((value) => value + 1);
    graph.focusNode(step.nodeId);
    ui.openInspector(step.nodeId, "parameters");
  };

  const exportJson = () => {
    const payload = serializePipelineGraph(graph.nodes, graph.edges, { x: 0, y: 0, zoom: 1 });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.replace(/[^\w-]+/g, "-").toLowerCase() || "graph"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const elapsed = ui.runStartedAt && isRunning ? now - ui.runStartedAt : null;
  const progress =
    isRunning && run.totalCount > 0 ? Math.min(1, run.completedCount / run.totalCount) : 0;

  return (
    <header className="relative z-20 flex h-[54px] shrink-0 items-center gap-2 border-b border-border bg-card/80 px-2.5 backdrop-blur sm:px-3">
      {/* Left zone */}
      <Link
        href={backHref}
        aria-label={`Back to ${backLabel}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
        <Link
          href={backHref}
          className="hidden rounded-md px-1.5 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground md:inline"
        >
          {backLabel}
        </Link>
        <span className="hidden text-muted-foreground/50 md:inline">/</span>
        <ProjectName name={projectName} projectId={graph.projectId} readOnly={ui.readOnly || !isProject} />
      </nav>
      <span className="ml-1 hidden h-4 w-px bg-border sm:block" />
      <SaveState />

      <div className="ml-auto flex items-center gap-1.5">
        {!isProject && boundary ? (
          boundary.valid && !saveValidationError ? (
            <span className="hidden items-center gap-2 rounded-full border border-[var(--status-ok)]/30 bg-[color-mix(in_srgb,var(--status-ok)_10%,transparent)] py-1 pr-3 pl-2 font-mono text-[11px] text-[var(--status-ok)] md:flex">
              <Check className="size-3.5" />
              {boundary.inputLabel} → {boundary.outputLabel}
            </span>
          ) : (
            <span
              title={saveValidationError ?? boundary.errors.join(" · ")}
              className="hidden max-w-[360px] items-center gap-2 rounded-full border border-[var(--status-warn)]/35 bg-[color-mix(in_srgb,var(--status-warn)_10%,transparent)] py-1 pr-3 pl-2 font-mono text-[11px] text-[var(--status-warn)] md:flex"
            >
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="truncate">{saveValidationError ?? boundary.errors[0] ?? "Pipeline is not valid yet"}</span>
            </span>
          )
        ) : null}

        {/* Run status chip: live run → failure → what blocks the next run → stale stopped/done. */}
        {isRunning ? (
          <span className="hidden max-w-[320px] items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] py-1 pr-3 pl-2 font-mono text-[11px] text-[var(--primary-text,var(--primary))] md:flex">
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
            <span className="truncate">{currentNode?.data.label ?? "Starting…"}</span>
            <span className="shrink-0 opacity-70">
              {Math.min(run.completedCount + 1, Math.max(run.totalCount, 1))}/{run.totalCount}
            </span>
            {elapsed != null ? <span className="shrink-0 opacity-70">{formatDuration(elapsed)}</span> : null}
          </span>
        ) : run.status === "error" && !isRunCancelled(run) ? (
          <button
            type="button"
            onClick={() => {
              if (run.failedNodeId) {
                graph.focusNode(run.failedNodeId);
                ui.openInspector(run.failedNodeId, "preview");
              }
            }}
            className="hidden max-w-[320px] items-center gap-2 rounded-full border border-destructive/30 bg-destructive/[0.08] py-1 pr-3 pl-2 font-mono text-[11px] text-destructive transition-colors hover:bg-destructive/[0.14] md:flex"
            title={run.error}
          >
            <XCircle className="size-3.5 shrink-0" />
            <span className="truncate">
              {run.failedNodeLabel ? `Failed at ${run.failedNodeLabel}` : (run.error ?? "Run failed")}
            </span>
          </button>
        ) : blockers.length > 0 && graph.nodes.length > 0 ? (
          <button
            type="button"
            onClick={goToBlocker}
            title={blockers[blockerCursor % blockers.length]?.issues[0]}
            className="hidden items-center gap-2 rounded-full border border-[var(--status-warn)]/35 bg-[color-mix(in_srgb,var(--status-warn)_10%,transparent)] py-1 pr-3 pl-2 font-mono text-[11px] text-[var(--status-warn)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-warn)_18%,transparent)] md:flex"
          >
            <AlertTriangle className="size-3.5" />
            {blockers.length === 1 ? "1 step needs attention" : `${blockers.length} steps need attention`}
          </button>
        ) : isRunCancelled(run) ? (
          <span className="hidden items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pr-3 pl-2 font-mono text-[11px] text-muted-foreground md:flex">
            <Square className="size-3 fill-current" />
            Stopped · {run.completedCount}/{run.totalCount} steps
          </span>
        ) : run.status === "success" ? (
          <span className="hidden items-center gap-2 rounded-full border border-[var(--status-ok)]/30 bg-[color-mix(in_srgb,var(--status-ok)_10%,transparent)] py-1 pr-3 pl-2 font-mono text-[11px] text-[var(--status-ok)] md:flex">
            <Check className="size-3.5" />
            Done · {run.totalCount} steps
            {run.lastRunAt ? (
              <span className="opacity-70">
                · <RelativeTime value={run.lastRunAt} />
              </span>
            ) : null}
          </span>
        ) : null}

        {/* Run / Stop */}
        {!ui.readOnly && isProject ? (
          isRunning ? (
            <button
              type="button"
              onClick={onStopRun}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/[0.06] px-3.5 text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/[0.12]"
            >
              <Square className="size-3.5 fill-current" />
              Stop
            </button>
          ) : (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => void graph.runFullPipeline()}
                disabled={!canRun}
                title={canRun ? "Run every step" : (blockers[0]?.issues[0] ?? "Add nodes first")}
                className="inline-flex h-9 items-center gap-2 rounded-l-lg bg-primary pr-3 pl-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_var(--primary)] transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
              >
                <Play className="size-3.5 fill-current" />
                Run
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label="More run options"
                      className="inline-flex h-9 items-center rounded-r-lg border-l border-white/20 bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/90"
                    />
                  }
                >
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem disabled={!canRun} onClick={() => void graph.runFullPipeline()}>
                    <PlayCircle /> Run all steps
                    <DropdownMenuShortcut>{shortcutLabel("Mod ↵")}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!selectedNode}
                    onClick={() => selectedNode && void graph.runNode(selectedNode.id)}
                  >
                    <Play /> {selectedNode ? `Run “${selectedNode.data.label}”` : "Run selected node"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setBatchOpen(true)}>
                    <Files /> Run on many documents…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        ) : null}

        <CommandPalette compact />

        {/* Overflow */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="More"
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {!ui.readOnly ? (
              <>
                <DropdownMenuItem disabled={!graph.nodes.length} onClick={() => graph.autoLayout()}>
                  <LayoutGrid /> Tidy up layout
                  <DropdownMenuShortcut>Shift L</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!graph.nodes.length} onClick={() => graph.clearAllRunState()}>
                  <Eraser /> Clear all results
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            {isProject && !ui.readOnly ? (
              <DropdownMenuItem disabled={!graph.nodes.length} onClick={() => setCreatePipelineOpen(true)}>
                <GitBranch /> Save as reusable pipeline…
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem disabled={!graph.nodes.length} onClick={exportJson}>
              <Download /> Export graph JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))}>
              <Keyboard /> Keyboard shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              {resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress hairline */}
      {isRunning ? (
        <span className="absolute inset-x-0 bottom-[-1px] h-[2px] overflow-hidden bg-primary/15">
          <span
            className="block h-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.max(6, progress * 100)}%` }}
          />
        </span>
      ) : null}

      {isProject ? (
        <>
          <BatchDocumentsDialog
            projectId={graph.projectId}
            open={batchOpen}
            onOpenChange={setBatchOpen}
            hasFileLoader={graph.nodes.some(
              (node) => node.data.modelId === "loader/pdf" || node.data.modelId === "loader/image",
            )}
          />
          <CreatePipelineFromCanvasDialog
            open={createPipelineOpen}
            onOpenChange={setCreatePipelineOpen}
            nodes={graph.nodes}
            edges={graph.edges}
          />
        </>
      ) : null}
    </header>
  );
}
