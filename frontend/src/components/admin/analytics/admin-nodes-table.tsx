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
import type { NodeBreakdownList } from "@/lib/api/analytics";

type AdminNodesTableProps = {
  nodes: NodeBreakdownList;
};

export function AdminNodesTable({ nodes }: AdminNodesTableProps) {
  const pagination = usePagination(nodes.items, { pageSize: 10 });

  if (nodes.items.length === 0) {
    return <AdminEmptyState message="No pipeline nodes on the platform yet." />;
  }

  return (
    <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
            <AdminTableHead>Project</AdminTableHead>
            <AdminTableHead>Owner</AdminTableHead>
            <AdminTableHead>Node</AdminTableHead>
            <AdminTableHead>Model</AdminTableHead>
            <AdminTableHead>Category</AdminTableHead>
            <AdminTableHead>Status</AdminTableHead>
            <AdminTableHead align="right">Runs</AdminTableHead>
            <AdminTableHead>Last run</AdminTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((node) => (
            <TableRow
              key={`${node.project_id}:${node.node_id}`}
              className={ADMIN_TABLE_ROW_CLASS}
            >
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                <Link
                  href={`/app/projects/${node.project_id}/canvas`}
                  className="font-medium transition-colors hover:text-primary"
                >
                  {node.project_name}
                </Link>
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}>
                {node.owner_email ?? "—"}
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs`}>
                {node.node_id}
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs`}>
                {node.model_id}
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>{node.category ?? "—"}</TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>{node.run_status ?? "—"}</TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                <span className="font-mono text-sm font-semibold">{node.run_count ?? 0}</span>
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                {node.last_run_at ? (
                  <RelativeTime value={node.last_run_at} />
                ) : (
                  "—"
                )}
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
  );
}
