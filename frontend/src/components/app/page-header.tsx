import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Small mono label above the title (e.g. "Workspace", "Build"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Primary / secondary actions, right-aligned on wide screens. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared header for workspace pages. Keeps title size, spacing, and action
 * placement identical across Dashboard, Projects, Pipelines, Jobs, etc.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[32px]",
            eyebrow ? "mt-2" : undefined,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[600px] text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** Standard page container used under the workspace shell. */
export function PageContainer({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: "wide" | "default" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full flex-1 px-4 py-8 sm:px-6 md:px-10 md:py-10",
        width === "wide" && "max-w-[1320px]",
        width === "default" && "max-w-[1180px]",
        width === "narrow" && "max-w-[980px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
