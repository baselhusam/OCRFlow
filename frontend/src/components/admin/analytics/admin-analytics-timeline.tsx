"use client";

import {
  AdminSectionHeading,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_ROW_CLASS,
  AdminTableHead,
  AdminTablePagination,
  AdminTableShell,
} from "@/components/admin/analytics/admin-analytics-primitives";
import { RelativeTime } from "@/components/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import type { RecentRunList } from "@/lib/api/analytics";
import { formatDurationMs } from "@/lib/api/analytics";

type AdminAnalyticsTimelineProps = {
  recentRuns: RecentRunList;
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

function getOwnerInitial(email: string | null | undefined): string {
  if (!email) return "?";
  return email.charAt(0).toUpperCase();
}

export function AdminAnalyticsTimeline({ recentRuns }: AdminAnalyticsTimelineProps) {
  const pagination = usePagination(recentRuns.items, { pageSize: 15 });

  return (
    <section aria-labelledby="admin-timeline-heading">
      <AdminSectionHeading
        title="Activity timeline"
        subtitle="chronological runs across all users"
      />
      {recentRuns.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs yet.</p>
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
                <AdminTableHead>Run</AdminTableHead>
                <AdminTableHead>Owner</AdminTableHead>
                <AdminTableHead>Pipeline</AdminTableHead>
                <AdminTableHead>Duration</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>When</AdminTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((run) => (
                <TableRow key={run.id} className={ADMIN_TABLE_ROW_CLASS}>
                  <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs`}>
                    {run.run_label}
                  </TableCell>
                  <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
                        {getOwnerInitial(run.owner_email)}
                      </span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {run.owner_email ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                    <span className="truncate text-sm font-medium">{run.pipeline_name}</span>
                  </TableCell>
                  <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}>
                    {formatDurationMs(run.duration_ms)}
                  </TableCell>
                  <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                    <StatusPill status={run.status} />
                  </TableCell>
                  <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}>
                    <RelativeTime value={run.created_at} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            onPageChange={pagination.goToPage}
          />
        </AdminTableShell>
      )}
    </section>
  );
}
