import type { ChartConfig } from "@/components/ui/chart";

/**
 * OCRFlow analytics palette — Pulse Violet primary, Slate secondary,
 * semantic status colors from the 2026 design system.
 */
export const chartColors = {
  accent: "var(--pulse)",
  secondary: "var(--muted-foreground)",
  tint: "var(--accent-tint)",
  danger: "var(--destructive)",
  success: "#12A65B",
  warning: "#E8A317",
  info: "#2F6BFF",
} as const;

export const activeUsersChartConfig = {
  active_users: {
    label: "Active users",
    color: chartColors.accent,
  },
} satisfies ChartConfig;

export const platformHealthChartConfig = {
  errors: {
    label: "Errors",
    color: chartColors.danger,
  },
  active_projects: {
    label: "Active projects",
    color: chartColors.success,
  },
} satisfies ChartConfig;

export const activityChartConfig = {
  runs: {
    label: "Runs",
    color: chartColors.accent,
  },
  pages: {
    label: "Pages",
    color: chartColors.secondary,
  },
} satisfies ChartConfig;

export const modelUsageChartConfig = {
  run_count: {
    label: "Runs",
    color: chartColors.accent,
  },
} satisfies ChartConfig;

export const pipelineRunsChartConfig = {
  runs: {
    label: "Runs",
    color: chartColors.accent,
  },
} satisfies ChartConfig;

export const activityDeepDiveChartConfig = {
  runs: {
    label: "Runs",
    color: chartColors.accent,
  },
  pages: {
    label: "Pages",
    color: chartColors.secondary,
  },
  errors: {
    label: "Errors",
    color: chartColors.danger,
  },
} satisfies ChartConfig;

export const runKindChartConfig = {
  count: { label: "Runs" },
} satisfies ChartConfig;

export const pipelineCompositionChartConfig = {
  count: {
    label: "Pipelines",
    color: chartColors.accent,
  },
} satisfies ChartConfig;
