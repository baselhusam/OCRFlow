"use client";

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
import type { UserLeaderboardList } from "@/lib/api/admin";
import { getRoleBadgeClassName, getRoleLabel } from "@/lib/auth/roles";

type AdminUsersTableProps = {
  users: UserLeaderboardList;
};

function getLeaderboardAvatarInitial(item: UserLeaderboardList["items"][number]): string {
  const source =
    item.full_name?.trim() ||
    item.display_name?.trim() ||
    item.email;
  return source.charAt(0).toUpperCase();
}

function getLeaderboardDisplayName(item: UserLeaderboardList["items"][number]): string {
  if (item.full_name?.trim()) return item.full_name.trim();
  if (item.display_name?.trim()) return item.display_name.trim();
  return item.email;
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const pagination = usePagination(users.items, { pageSize: 10 });

  if (users.items.length === 0) {
    return <AdminEmptyState message="No user activity recorded yet." />;
  }

  return (
    <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
            <AdminTableHead>User</AdminTableHead>
            <AdminTableHead>Role</AdminTableHead>
            <AdminTableHead align="right">Projects</AdminTableHead>
            <AdminTableHead align="right">Runs</AdminTableHead>
            <AdminTableHead align="right">Pages</AdminTableHead>
            <AdminTableHead>Last login</AdminTableHead>
            <AdminTableHead>Last run</AdminTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((item) => (
            <TableRow key={item.user_id} className={ADMIN_TABLE_ROW_CLASS}>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
                    {getLeaderboardAvatarInitial(item)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {getLeaderboardDisplayName(item)}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {item.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                <span
                  className={getRoleBadgeClassName(
                    item.role as "admin" | "view_admin" | "user",
                  )}
                >
                  {getRoleLabel(item.role as "admin" | "view_admin" | "user")}
                </span>
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                <span className="font-mono text-sm font-semibold">{item.project_count}</span>
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                <span className="font-mono text-sm font-semibold">{item.run_count}</span>
              </TableCell>
              <TableCell className={`${ADMIN_TABLE_CELL_CLASS} text-right tabular-nums`}>
                <span className="font-mono text-sm font-semibold">{item.pages_processed}</span>
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                {item.last_login_at ? (
                  <RelativeTime value={item.last_login_at} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className={ADMIN_TABLE_CELL_CLASS}>
                {item.last_run_at ? (
                  <RelativeTime value={item.last_run_at} />
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
