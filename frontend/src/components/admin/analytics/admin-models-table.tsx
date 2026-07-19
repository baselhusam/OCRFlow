"use client";

import { RelativeTime } from "@/components/relative-time";
import {
  AdminEmptyState,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_ROW_CLASS,
  AdminTableHead,
  AdminTablePagination,
  AdminTableShell,
} from "@/components/admin/analytics/admin-analytics-primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import {
  formatSuccessRate,
  type ModelUsageList,
} from "@/lib/api/analytics";

type AdminModelsTableProps = {
  models: ModelUsageList;
};

export function AdminModelsTable({ models }: AdminModelsTableProps) {
  const pagination = usePagination(models.items, { pageSize: 10 });

  if (models.items.length === 0) {
    return <AdminEmptyState message="No model runs recorded yet." />;
  }

  return (
    <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
            <AdminTableHead>Model</AdminTableHead>
            <AdminTableHead>Category</AdminTableHead>
            <AdminTableHead align="right">Runs</AdminTableHead>
            <AdminTableHead align="right">Avg latency</AdminTableHead>
            <AdminTableHead align="right">Success</AdminTableHead>
            <AdminTableHead>Last used</AdminTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((model) => (
            <TableRow key={model.model_id} className={ADMIN_TABLE_ROW_CLASS}>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                <div>
                  <p className="font-medium">{model.display_name ?? model.model_id}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {model.model_id}
                  </p>
                </div>
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>{model.category ?? "—"}</TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                <span className="font-mono text-sm font-semibold">{model.run_count}</span>
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                {model.avg_latency_ms !== null
                  ? `${model.avg_latency_ms.toFixed(0)} ms`
                  : "—"}
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                {formatSuccessRate(model.success_rate)}
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                {model.last_used_at ? (
                  <RelativeTime value={model.last_used_at} />
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
