import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "danger" | "neutral" | "brand";

const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
  ok: {
    pill: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warn: {
    pill: "bg-amber-500/12 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  danger: {
    pill: "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-[#ff7aa0]",
    dot: "bg-destructive",
  },
  neutral: {
    pill: "bg-foreground/[0.06] text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  brand: {
    pill: "bg-primary/10 text-primary dark:bg-primary/20",
    dot: "bg-primary dark:bg-[var(--primary-text)]",
  },
};

/** Small rounded status label with a coloured dot; theme-aware. */
export function StatusPill({
  tone,
  children,
  pulse = false,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
        classes.pill,
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", classes.dot, pulse && "animate-pulse")}
        aria-hidden
      />
      {children}
    </span>
  );
}
