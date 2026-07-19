import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { cn } from "@/lib/utils";
import type { RecentRunItem } from "@/lib/api/analytics";
import { formatDurationMs } from "@/lib/api/analytics";

type RecentRunsTableProps = {
  runs: RecentRunItem[];
};

const STATUS_STYLES: Record<
  string,
  { pillBg: string; pillColor: string; dotColor: string }
> = {
  Done: {
    pillBg: "rgba(18,166,91,0.12)",
    pillColor: "#0E7C45",
    dotColor: "#12A65B",
  },
  Failed: {
    pillBg: "rgba(224,36,94,0.12)",
    pillColor: "#B5113F",
    dotColor: "#E0245E",
  },
  Running: {
    pillBg: "rgba(232,163,23,0.14)",
    pillColor: "#9A6B07",
    dotColor: "#E8A317",
  },
};

function StatusPill({ status }: { status: string }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.Done;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: styles.pillBg, color: styles.pillColor }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: styles.dotColor }}
        aria-hidden
      />
      {status}
    </span>
  );
}

export function RecentRunsTable({ runs }: RecentRunsTableProps) {
  return (
    <div className={cn(dashboardCardClassName, "overflow-hidden transition-all duration-300 hover:shadow-lg")}>
      <div className="flex items-center justify-between px-8 pt-8">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-foreground">
            Recent runs
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary/40" />
            <p className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              latest executions
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-border bg-secondary/20 font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              <th className="px-8 py-4 text-left">Run ID</th>
              <th className="px-6 py-4 text-left">Pipeline</th>
              <th className="px-6 py-4 text-left">Duration</th>
              <th className="px-8 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p>No runs recorded in this range yet.</p>
                    <p className="text-xs opacity-70">Execute a pipeline to see activity here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr
                  key={run.id}
                  className="group/row border-b border-border/40 transition-colors hover:bg-secondary/10 last:border-b-0"
                >
                  <td className="px-8 py-4">
                    <span className="font-mono text-[13px] font-semibold text-foreground group-hover/row:text-primary transition-colors">
                      {run.run_label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-medium text-foreground/80">
                      {run.pipeline_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[12px] font-medium text-muted-foreground">
                      {formatDurationMs(run.duration_ms)}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <StatusPill status={run.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
