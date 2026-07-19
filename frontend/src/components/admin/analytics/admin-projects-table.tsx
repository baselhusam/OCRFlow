"use client";

import Link from "next/link";

import {
  AdminEmptyState,
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
import type { ProjectBreakdownList } from "@/lib/api/analytics";
import type { ProjectStatus } from "@/lib/api/client";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  getProjectColorTint,
  getProjectIconComponent,
} from "@/lib/projects/appearance";
import { getProjectStatusStyles } from "@/lib/projects/status";

type AdminProjectsTableProps = {
  projects: ProjectBreakdownList;
};

function ProjectStatusBadge({
  status,
  color,
}: {
  status: string | null | undefined;
  color: string | null | undefined;
}) {
  const styles = getProjectStatusStyles(
    (status as ProjectStatus) ?? "idle",
    color ?? DEFAULT_PROJECT_COLOR,
  );

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
      {styles.label}
    </span>
  );
}

export function AdminProjectsTable({ projects }: AdminProjectsTableProps) {
  const pagination = usePagination(projects.items, { pageSize: 10 });

  if (projects.items.length === 0) {
    return <AdminEmptyState message="No projects on the platform yet." />;
  }

  return (
    <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
            <AdminTableHead>Project</AdminTableHead>
            <AdminTableHead>Owner</AdminTableHead>
            <AdminTableHead>Status</AdminTableHead>
            <AdminTableHead align="right">Nodes</AdminTableHead>
            <AdminTableHead align="right">Models</AdminTableHead>
            <AdminTableHead align="right">Files</AdminTableHead>
            <AdminTableHead align="right">Runs</AdminTableHead>
            <AdminTableHead>Last activity</AdminTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((project) => {
            const Icon = getProjectIconComponent(project.icon ?? DEFAULT_PROJECT_ICON);
            const tint = getProjectColorTint(project.color ?? DEFAULT_PROJECT_COLOR);
            const accent = project.color ?? DEFAULT_PROJECT_COLOR;

            return (
              <TableRow key={project.project_id} className={ADMIN_TABLE_ROW_CLASS}>
                <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ backgroundColor: tint, color: accent }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <Link
                      href={`/app/projects/${project.project_id}/canvas`}
                      className="font-medium transition-colors hover:text-primary"
                    >
                      {project.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}>
                  {project.owner_email ?? "—"}
                </TableCell>
                <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                  <ProjectStatusBadge status={project.status} color={project.color} />
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                  {project.node_count}
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                  {project.model_count}
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                  {project.file_count}
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                  <span className="font-mono text-sm font-semibold">{project.run_count}</span>
                </TableCell>
                <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                  {project.last_activity_at ? (
                    <RelativeTime value={project.last_activity_at} />
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
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
  );
}
