import { cn } from "@/lib/utils";

export const dashboardCardClassName =
  "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(20,18,37,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]";

export const dashboardStatCardClassName = "dashboard-stat-card group/stat p-5";

export const dashboardIconTileClassName =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--workspace-soft-violet)] text-primary dark:bg-primary/20";

export function dashboardInteractiveCardClassName(className?: string) {
  return cn(
    dashboardCardClassName,
    "transition-colors hover:border-primary/30 hover:bg-secondary/20",
    className,
  );
}

export const projectCardClassName = "project-card group/project p-[22px]";
