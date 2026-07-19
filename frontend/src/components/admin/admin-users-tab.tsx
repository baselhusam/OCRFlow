"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from "lucide-react";

import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUser, AdminUserCreate } from "@/lib/api/admin";
import { createAdminUser } from "@/lib/api/admin";
import type { User, UserRole } from "@/lib/api/client";
import { getRoleBadgeClassName, getRoleLabel } from "@/lib/auth/roles";
import {
  getUserAvatarInitial,
  getUserDisplayName,
} from "@/lib/auth/display-name";
import { cn } from "@/lib/utils";

type AdminUsersTabProps = {
  users: AdminUser[];
  canManage: boolean;
  currentUserId: string;
};

type SortColumn =
  | "user"
  | "role"
  | "projects"
  | "runs"
  | "lastLogin"
  | "lastRun"
  | "status";

type SortDirection = "asc" | "desc";

const ROLE_OPTIONS: UserRole[] = ["admin", "view_admin", "user"];

const ROLE_SORT_ORDER: Record<UserRole, number> = {
  admin: 0,
  view_admin: 1,
  user: 2,
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 2) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 14) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatFullTimestamp(value: string | null): string | undefined {
  if (!value) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMemberSince(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toDisplayUser(member: AdminUser): User {
  return {
    id: member.id,
    email: member.email,
    full_name: member.full_name,
    display_name: member.display_name,
    bio: null,
    role: member.role,
    preferences: {
      appearance: "light",
      default_output_format: "json",
      default_ocr_model: "ocrflow-base v2.4",
      auto_run_on_upload: true,
      email_on_run_fail: true,
      weekly_summary: false,
    },
    is_active: member.is_active,
    last_login_at: member.last_login_at,
    created_at: member.created_at,
    updated_at: member.updated_at,
  };
}

function compareUsers(
  a: AdminUser,
  b: AdminUser,
  column: SortColumn,
  direction: SortDirection,
): number {
  const factor = direction === "asc" ? 1 : -1;

  switch (column) {
    case "user": {
      const aName = getUserDisplayName(toDisplayUser(a)).toLowerCase();
      const bName = getUserDisplayName(toDisplayUser(b)).toLowerCase();
      return factor * aName.localeCompare(bName, undefined, { sensitivity: "base" });
    }
    case "role":
      return factor * (ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role]);
    case "projects":
      return factor * (a.project_count - b.project_count);
    case "runs":
      return factor * (a.run_count - b.run_count);
    case "lastLogin":
      return factor * compareNullableTimestamps(a.last_login_at, b.last_login_at);
    case "lastRun":
      return factor * compareNullableTimestamps(a.last_run_at, b.last_run_at);
    case "status": {
      const aActive = a.is_active ? 1 : 0;
      const bActive = b.is_active ? 1 : 0;
      return factor * (aActive - bActive);
    }
    default:
      return 0;
  }
}

function compareNullableTimestamps(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return Date.parse(a) - Date.parse(b);
}

export function AdminUsersTab({
  users,
  canManage,
  currentUserId,
}: AdminUsersTabProps) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("user");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => compareUsers(a, b, sortColumn, sortDirection)),
    [users, sortColumn, sortDirection],
  );

  const activeCount = users.filter((user) => user.is_active).length;
  const totalRuns = users.reduce((sum, user) => sum + user.run_count, 0);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setPendingUserId(userId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to update role");
      }
      router.refresh();
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Failed to update role");
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleDeactivate(userId: string) {
    setPendingUserId(userId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to deactivate user");
      }
      router.refresh();
    } catch (deactivateError) {
      setError(
        deactivateError instanceof Error
          ? deactivateError.message
          : "Failed to deactivate user",
      );
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total users" value={String(users.length)} />
        <StatCard label="Active users" value={String(activeCount)} />
        <StatCard label="Total runs" value={String(totalRuns)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-bold text-foreground">All users</h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            platform accounts
          </p>
        </div>
        {canManage ? <CreateUserDialog /> : null}
      </div>

      <div className={cn(dashboardStatCardClassName, "mt-5 overflow-hidden p-0")}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary/30 hover:bg-secondary/30">
              <SortableTableHead
                label="User"
                column="user"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Role"
                column="role"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Projects"
                column="projects"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableTableHead
                label="Runs"
                column="runs"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableTableHead
                label="Last login"
                column="lastLogin"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableTableHead
                label="Last run"
                column="lastRun"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableTableHead
                label="Status"
                column="status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              {canManage ? (
                <TableHead className="h-auto px-5 py-3.5 text-right font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  Actions
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={canManage ? 8 : 7}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((member) => {
                const isYou = member.id === currentUserId;
                const displayUser = toDisplayUser(member);

                return (
                  <TableRow
                    key={member.id}
                    className="border-b border-border/60 hover:bg-secondary/15"
                  >
                    <TableCell className="px-5 py-4 align-middle">
                      <div className="flex min-w-[220px] items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
                          {getUserAvatarInitial(displayUser)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {getUserDisplayName(displayUser)}
                            </span>
                            {isYou ? (
                              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-primary uppercase">
                                You
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {member.email}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
                            Joined {formatMemberSince(member.created_at)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4 align-middle">
                      {canManage && !isYou ? (
                        <Select
                          value={member.role}
                          disabled={pendingUserId === member.id}
                          onValueChange={(value) =>
                            void handleRoleChange(member.id, value as UserRole)
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 w-fit rounded-full border-0 px-2.5 text-xs font-semibold",
                              getRoleBadgeClassName(member.role),
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role} value={role}>
                                {getRoleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            getRoleBadgeClassName(member.role),
                          )}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-right align-middle tabular-nums">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {member.project_count.toLocaleString()}
                      </span>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-right align-middle tabular-nums">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {member.run_count.toLocaleString()}
                      </span>
                      {member.pages_processed > 0 ? (
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {member.pages_processed.toLocaleString()} pages
                        </p>
                      ) : null}
                    </TableCell>

                    <TableCell
                      className="px-5 py-4 text-right align-middle"
                      title={formatFullTimestamp(member.last_login_at)}
                    >
                      <span
                        className={cn(
                          "font-mono text-xs",
                          member.last_login_at
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTimestamp(member.last_login_at)}
                      </span>
                    </TableCell>

                    <TableCell
                      className="px-5 py-4 text-right align-middle"
                      title={formatFullTimestamp(member.last_run_at)}
                    >
                      <span
                        className={cn(
                          "font-mono text-xs",
                          member.last_run_at ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {formatTimestamp(member.last_run_at)}
                      </span>
                    </TableCell>

                    <TableCell className="px-5 py-4 align-middle">
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          member.is_active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            member.is_active ? "bg-emerald-500" : "bg-amber-500",
                          )}
                          aria-hidden
                        />
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>

                    {canManage ? (
                      <TableCell className="px-5 py-4 text-right align-middle">
                        {!isYou && member.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={pendingUserId === member.id}
                            onClick={() => void handleDeactivate(member.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function SortableTableHead({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  align?: "left" | "right";
}) {
  const active = sortColumn === column;
  const SortIcon = active
    ? sortDirection === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead
      className={cn(
        "h-auto px-5 py-3.5 align-middle",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-sort={
          active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
        }
        className={cn(
          "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors",
          align === "right" && "ml-auto",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <SortIcon
          className={cn("size-3 shrink-0", active ? "text-primary" : "opacity-45")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(dashboardStatCardClassName, "px-5 py-4")}>
      <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setIsSaving(true);
    setError(null);
    const payload: AdminUserCreate = {
      email,
      password,
      full_name: fullName.trim() || null,
      role,
    };
    try {
      const response = await createAdminUser(payload);
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to create user");
      }
      setOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("user");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" aria-hidden />
        Create user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="create-password">Password</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="create-name">Full name</Label>
            <Input
              id="create-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getRoleLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button onClick={() => void handleCreate()} disabled={isSaving || !email || !password}>
            {isSaving ? "Creating..." : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
