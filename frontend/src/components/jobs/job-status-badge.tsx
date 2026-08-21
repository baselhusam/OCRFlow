import { cn } from "@/lib/utils";
import type { PipelineJobStatus } from "@/lib/api/jobs";

const STATUS_STYLES: Record<
  PipelineJobStatus | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "partial",
  string
> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  succeeded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
  partial: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  partial: "Partial",
  cancelled: "Cancelled",
};

export function JobStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status as PipelineJobStatus] ?? STATUS_STYLES.queued,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "running" && "animate-pulse bg-amber-500",
          status === "succeeded" && "bg-emerald-500",
          status === "failed" && "bg-destructive",
          status === "partial" && "bg-amber-500",
          (status === "queued" || status === "cancelled") && "bg-muted-foreground/60",
        )}
        aria-hidden
      />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
