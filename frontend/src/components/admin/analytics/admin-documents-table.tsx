"use client";

import Link from "next/link";
import { FileText, Image as ImageIcon } from "lucide-react";

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
import { formatBytes, type DocumentBreakdownList } from "@/lib/api/analytics";

type AdminDocumentsTableProps = {
  documents: DocumentBreakdownList;
};

function FormatIcon({ format }: { format: string }) {
  const Icon = format === "image" ? ImageIcon : FileText;

  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--workspace-soft-violet)] text-primary dark:bg-primary/20"
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}

export function AdminDocumentsTable({ documents }: AdminDocumentsTableProps) {
  const pagination = usePagination(documents.items, { pageSize: 10 });

  if (documents.items.length === 0) {
    return <AdminEmptyState message="No uploaded documents on the platform yet." />;
  }

  return (
    <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
            <AdminTableHead>File</AdminTableHead>
            <AdminTableHead>Project</AdminTableHead>
            <AdminTableHead>Owner</AdminTableHead>
            <AdminTableHead>Format</AdminTableHead>
            <AdminTableHead align="right">Size</AdminTableHead>
            <AdminTableHead>Uploaded</AdminTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((document) => (
            <TableRow
              key={`${document.project_id}:${document.asset_id}`}
              className={ADMIN_TABLE_ROW_CLASS}
            >
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                <div className="flex items-center gap-3">
                  <FormatIcon format={document.format} />
                  <span className="max-w-[200px] truncate text-sm font-medium">
                    {document.filename}
                  </span>
                </div>
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                <Link
                  href={`/app/projects/${document.project_id}/canvas`}
                  className="transition-colors hover:text-primary"
                >
                  {document.project_name}
                </Link>
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} font-mono text-xs text-muted-foreground`}>
                {document.owner_email ?? "—"}
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} uppercase`}>
                {document.format}
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                {formatBytes(document.size_bytes)}
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                {document.uploaded_at ? (
                  <RelativeTime value={document.uploaded_at} />
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
