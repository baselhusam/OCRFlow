"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const ADMIN_TABLE_HEAD_CLASS =
  "h-auto px-5 py-3.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase";

export const ADMIN_TABLE_ROW_CLASS =
  "border-b border-border/60 hover:bg-secondary/15";

export const ADMIN_TABLE_CELL_CLASS = "px-5 py-4 align-middle";

type AdminSectionHeadingProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function AdminSectionHeading({
  title,
  subtitle,
  action,
}: AdminSectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type AdminStatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
};

export function AdminStatCard({ label, value, icon: Icon, hint }: AdminStatCardProps) {
  return (
    <div className={cn(dashboardStatCardClassName, "px-5 py-4")}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type AdminStatGridProps = {
  children: React.ReactNode;
  columns?: 3 | 4;
};

export function AdminStatGrid({ children, columns = 4 }: AdminStatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

type AdminTableShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminTableShell({ children, className }: AdminTableShellProps) {
  return (
    <div className={cn(dashboardStatCardClassName, "overflow-hidden p-0", className)}>
      {children}
    </div>
  );
}

export function AdminTableHead({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <TableHead
      className={cn(
        ADMIN_TABLE_HEAD_CLASS,
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

type AdminTablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
};

export function AdminTablePagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
}: AdminTablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/10 px-5 py-3.5">
      <p className="font-mono text-[11px] text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-lg px-3 text-xs font-semibold"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </Button>
        <span className="min-w-[72px] text-center font-mono text-[11px] text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-lg px-3 text-xs font-semibold"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

type AdminEmptyStateProps = {
  message: string;
};

export function AdminEmptyState({ message }: AdminEmptyStateProps) {
  return (
    <div className={cn(dashboardStatCardClassName, "px-6 py-10 text-center text-sm text-muted-foreground")}>
      {message}
    </div>
  );
}
