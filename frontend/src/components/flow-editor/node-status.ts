import type { FullRunNodeState } from "@/components/flow-editor/editor-ui-context";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import type { NodeReadiness } from "@/lib/canvas/node-readiness";
import { summarizeOutput } from "@/lib/canvas/node-preview-summary";
import { getLoadedPageCount } from "@/lib/canvas/source-loader-utils";
import type { PipelineNodeData } from "@/lib/canvas/types";

export type NodeTone =
  | "idle"
  | "ready"
  | "blocked"
  | "queued"
  | "running"
  | "done"
  | "error"
  | "offline";

export type NodeAction = "choose-file" | "run" | "retry" | "preview" | "stop" | "fix";

export type NodeStatus = {
  tone: NodeTone;
  /** Short pill text: Idle / Running / Done … */
  pill: string;
  /** Right-hand footer text (metric or hint). */
  detail: string | null;
  /** 0–1 progress for the pill fill, when known. */
  progress: number | null;
  action: NodeAction | null;
};

type Input = {
  data: PipelineNodeData;
  readiness: NodeReadiness | null;
  offline: boolean;
  fullRunState?: FullRunNodeState;
  elapsedMs?: number | null;
};

const KIND_NOUNS: Partial<Record<string, [string, string]>> = {
  pages: ["page", "pages"],
  page: ["page", "pages"],
  regions: ["region", "regions"],
  lines: ["line", "lines"],
  reading_order: ["block", "blocks"],
  tables: ["table", "tables"],
  formulas: ["formula", "formulas"],
  figures: ["figure", "figures"],
  document: ["page", "pages"],
};

/** "16 lines", "3 regions", "JSON ready" — a result count in the node's own words. */
export function describeOutput(data: PipelineNodeData): string | null {
  const output = data.cachedOutput;
  if (!output) return summarizeOutput(data);
  if (output.kind === "json") return "JSON ready";
  if (output.kind === "text") {
    const raw = output.raw as { text?: string } | string | null;
    const text = typeof raw === "string" ? raw : (raw?.text ?? "");
    return text ? `${text.length.toLocaleString()} chars` : "Text ready";
  }
  const count = output.preview?.itemCount ?? output.preview?.pageCount;
  const noun = KIND_NOUNS[output.kind];
  if (count != null && noun) return `${count} ${count === 1 ? noun[0] : noun[1]}`;
  return summarizeOutput(data);
}

/**
 * The graph hook reports a user-cancelled "Run all" as an error with this
 * message; the editor shows it as a neutral "Stopped" instead of a failure.
 */
export function isRunCancelled(run: { status: string; error?: string | null }): boolean {
  return run.status === "error" && run.error === "Pipeline run was cancelled";
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

/** First readiness issue, rewritten into a short imperative hint. */
export function shortIssue(issue: string | undefined): string {
  if (!issue) return "Not ready";
  const lower = issue.toLowerCase();
  if (lower.includes("connect")) return "Connect an input";
  if (lower.includes("upload") || lower.includes("document")) return "Add a document";
  if (lower.includes("run ") || lower.includes("upstream")) return "Run upstream first";
  if (lower.includes("schema")) return "Define output fields";
  if (lower.includes("prompt")) return "Write a prompt";
  if (lower.includes("model")) return "Pick a model";
  return issue.length > 28 ? `${issue.slice(0, 27)}…` : issue;
}

export function getNodeStatus({
  data,
  readiness,
  offline,
  fullRunState,
  elapsedMs,
}: Input): NodeStatus {
  const isSource = SOURCE_NODE_MODELS.has(data.modelId);
  const hasAsset = Boolean(data.params.assetId);

  if (data.runStatus === "running" || fullRunState === "running") {
    const map = data.mapProgress;
    if (map && map.total > 0) {
      return {
        tone: "running",
        pill: "Running",
        detail: `${map.completed} / ${map.total} pages`,
        progress: map.completed / map.total,
        action: "stop",
      };
    }
    const sub = data.subRunProgress;
    if (sub && sub.total > 0) {
      return {
        tone: "running",
        pill: "Running",
        detail: `step ${Math.min(sub.completed + 1, sub.total)} / ${sub.total}`,
        progress: sub.completed / sub.total,
        action: null,
      };
    }
    return {
      tone: "running",
      pill: isSource ? "Loading" : "Running",
      detail: elapsedMs != null ? formatDuration(elapsedMs) : null,
      progress: null,
      action: null,
    };
  }

  if (fullRunState === "done") {
    return { tone: "done", pill: "Done", detail: "Finished in this run", progress: 1, action: null };
  }

  if (fullRunState === "queued") {
    return { tone: "queued", pill: "Queued", detail: "Waiting…", progress: 0, action: null };
  }

  if (data.runStatus === "error") {
    const err = data.runResult?.error ?? "Run failed";
    const where =
      data.mapProgress && data.mapProgress.failed > 0
        ? `${data.mapProgress.failed} page${data.mapProgress.failed === 1 ? "" : "s"} failed`
        : err.length > 30
          ? `${err.slice(0, 29)}…`
          : err;
    return { tone: "error", pill: "Error", detail: where, progress: null, action: "retry" };
  }

  if (offline) {
    return { tone: "offline", pill: "Offline", detail: "Engine not running", progress: null, action: "fix" };
  }

  if (isSource) {
    if (!hasAsset) {
      return { tone: "idle", pill: "No file", detail: null, progress: null, action: "choose-file" };
    }
    if (data.cachedOutput) {
      const pages = getLoadedPageCount(data);
      return {
        tone: "done",
        pill: "Loaded",
        detail: pages != null ? `${pages} page${pages === 1 ? "" : "s"}` : null,
        progress: 1,
        action: "preview",
      };
    }
    return { tone: "ready", pill: "Ready", detail: "Load pages", progress: null, action: "run" };
  }

  if (data.cachedOutput || data.runStatus === "success") {
    const mapped = data.cachedOutput?.mapped;
    const summary = mapped?.length
      ? `${mapped.length} pages`
      : describeOutput(data);
    return {
      tone: "done",
      pill: "Done",
      detail: summary,
      progress: 1,
      action: "preview",
    };
  }

  if (readiness && !readiness.ready) {
    return {
      tone: "blocked",
      pill: "Waiting",
      detail: shortIssue(readiness.issues[0]),
      progress: null,
      action: null,
    };
  }

  return { tone: "ready", pill: "Ready", detail: "Run to preview", progress: null, action: "run" };
}

export const TONE_STYLES: Record<NodeTone, { dot: string; pill: string; fill: string }> = {
  idle: {
    dot: "bg-muted-foreground/50",
    pill: "text-muted-foreground bg-muted/60",
    fill: "bg-muted-foreground/20",
  },
  ready: {
    dot: "bg-[var(--primary-text,var(--primary))]",
    pill: "text-[var(--primary-text,var(--primary))] bg-primary/10",
    fill: "bg-primary/20",
  },
  blocked: {
    dot: "bg-[var(--status-warn)]",
    pill: "text-[var(--status-warn)] bg-[color-mix(in_srgb,var(--status-warn)_14%,transparent)]",
    fill: "bg-[var(--status-warn)]/20",
  },
  queued: {
    dot: "bg-muted-foreground/60",
    pill: "text-muted-foreground bg-muted/60",
    fill: "bg-muted-foreground/20",
  },
  running: {
    dot: "bg-primary animate-pulse",
    pill: "text-[var(--primary-text,var(--primary))] bg-primary/12",
    fill: "bg-primary/35",
  },
  done: {
    dot: "bg-[var(--status-ok)]",
    pill: "text-[var(--status-ok)] bg-[color-mix(in_srgb,var(--status-ok)_14%,transparent)]",
    fill: "bg-[var(--status-ok)]/25",
  },
  error: {
    dot: "bg-destructive",
    pill: "text-destructive bg-destructive/12",
    fill: "bg-destructive/25",
  },
  offline: {
    dot: "bg-destructive/70",
    pill: "text-destructive bg-destructive/10",
    fill: "bg-destructive/20",
  },
};
