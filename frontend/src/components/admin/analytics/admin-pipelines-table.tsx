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
import type { PipelineBreakdownList } from "@/lib/api/analytics";

type AdminPipelinesTableProps = {
  pipelines: PipelineBreakdownList;
};

function formatPipelineIO(
  input: string | null,
  output: string | null,
): string | null {
  if (!input || !output) return null;
  return `${input} → ${output}`;
}

export function AdminPipelinesTable({ pipelines }: AdminPipelinesTableProps) {
  const pagination = usePagination(pipelines.items, { pageSize: 10 });

  if (pipelines.items.length === 0) {
    return <AdminEmptyState message="No pipeline definitions on the platform yet." />;
  }

  return (
    <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
            <AdminTableHead>Pipeline</AdminTableHead>
            <AdminTableHead>Owner</AdminTableHead>
            <AdminTableHead>I/O</AdminTableHead>
            <AdminTableHead align="right">Nodes</AdminTableHead>
            <AdminTableHead align="right">Models</AdminTableHead>
            <AdminTableHead>Status</AdminTableHead>
            <AdminTableHead>Created</AdminTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((pipeline) => {
            const ioLabel = formatPipelineIO(
              pipeline.input_type_label,
              pipeline.output_type_label,
            );

            return (
              <TableRow key={pipeline.pipeline_id} className={ADMIN_TABLE_ROW_CLASS}>
                <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                  <div className="flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: pipeline.accent_color }}
                      aria-hidden
                    />
                    <Link
                      href={`/app/pipelines/${pipeline.pipeline_id}/canvas`}
                      className="font-medium transition-colors hover:text-primary"
                    >
                      {pipeline.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell
                  className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}
                >
                  {pipeline.owner_email ?? "—"}
                </TableCell>
                <TableCell
                  className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}
                >
                  {ioLabel ?? "—"}
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                  {pipeline.node_count}
                </TableCell>
                <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                  {pipeline.model_count}
                </TableCell>
                <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                  {pipeline.is_archived ? (
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                      Archived
                    </span>
                  ) : (
                    <span className="rounded-md bg-[rgba(18,166,91,0.10)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#0E7C45] uppercase">
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                  <RelativeTime value={pipeline.created_at} />
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
