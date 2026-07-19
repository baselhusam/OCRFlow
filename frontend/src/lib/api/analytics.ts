export type AnalyticsRange = "7d" | "30d" | "90d";

export type AnalyticsOverview = {
  project_count: number;
  total_nodes: number;
  total_edges: number;
  unique_models: number;
  total_files: number;
  active_pipelines: number;
  total_runs: number;
  runs_today: number;
  pages_processed: number;
  success_rate: number | null;
  last_activity_at: string | null;
};

export type ActivityBucket = {
  bucket_start: string;
  runs: number;
  pages: number;
  errors: number;
  active_projects: number;
};

export type ActivitySeries = {
  bucket: string;
  from_at: string;
  to_at: string;
  items: ActivityBucket[];
};

export type AnalyticsKpi = {
  label: string;
  value: string;
  delta: string;
  delta_direction: "up" | "down" | "neutral";
  delta_label: string;
};

export type AnalyticsSummary = {
  range: AnalyticsRange;
  from_at: string;
  to_at: string;
  pages_processed: number;
  pipeline_runs: number;
  success_rate: number | null;
  avg_latency_ms_per_page: number | null;
  kpis: AnalyticsKpi[];
};

export type RunOutcomeSegment = {
  label: string;
  count: number;
  percentage: number;
  color_key: "done" | "failed" | "running";
};

export type RunOutcomes = {
  total_runs: number;
  segments: RunOutcomeSegment[];
};

export type TopPipelineItem = {
  project_id: string;
  name: string;
  run_count: number;
  share: number;
};

export type TopPipelineList = {
  items: TopPipelineItem[];
};

export type RecentRunItem = {
  id: string;
  run_label: string;
  project_id: string | null;
  pipeline_name: string;
  duration_ms: number | null;
  status: string;
  created_at: string;
  owner_id?: string | null;
  owner_email?: string | null;
};

export type RecentRunList = {
  items: RecentRunItem[];
  total: number;
};

export type ModelUsageItem = {
  model_id: string;
  display_name: string | null;
  category: string | null;
  run_count: number;
  avg_latency_ms: number | null;
  success_rate: number | null;
  last_used_at: string | null;
};

export type ModelUsageList = {
  items: ModelUsageItem[];
};

export type ProjectBreakdownItem = {
  project_id: string;
  name: string;
  node_count: number;
  model_count: number;
  file_count: number;
  run_count: number;
  last_activity_at: string | null;
  updated_at: string;
  owner_id?: string | null;
  owner_email?: string | null;
  icon?: string | null;
  color?: string | null;
  status?: string | null;
};

export type ProjectBreakdownList = {
  items: ProjectBreakdownItem[];
};

export type NodeBreakdownItem = {
  project_id: string;
  project_name: string;
  node_id: string;
  model_id: string;
  category: string | null;
  run_status: string | null;
  last_run_at: string | null;
  owner_email?: string | null;
  run_count?: number;
};

export type NodeBreakdownList = {
  items: NodeBreakdownItem[];
};

export type DocumentBreakdownItem = {
  project_id: string;
  project_name: string;
  asset_id: string;
  filename: string;
  format: string;
  size_bytes: number;
  uploaded_at: string | null;
  owner_email?: string | null;
};

export type DocumentBreakdownList = {
  items: DocumentBreakdownItem[];
};

export type UserActivityBucket = {
  bucket_start: string;
  active_users: number;
};

export type UserActivitySeries = {
  bucket: string;
  from_at: string;
  to_at: string;
  items: UserActivityBucket[];
};

export type PipelineLibraryStats = {
  total_pipelines: number;
  active_pipelines: number;
  archived_pipelines: number;
  avg_nodes: number;
  avg_models: number;
  avg_edges: number;
  unique_io_types: number;
};

export type PipelineBreakdownItem = {
  pipeline_id: string;
  name: string;
  description: string | null;
  node_count: number;
  edge_count: number;
  model_count: number;
  input_type_label: string | null;
  output_type_label: string | null;
  accent_color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
  owner_email?: string | null;
};

export type PipelineBreakdownList = {
  items: PipelineBreakdownItem[];
};

export type RunKindSegment = {
  label: string;
  count: number;
  percentage: number;
  color_key: "test_run" | "pipeline_run" | "inference_run";
};

export type RunKindBreakdown = {
  total_runs: number;
  segments: RunKindSegment[];
};

export const ANALYTICS_RANGES: AnalyticsRange[] = ["7d", "30d", "90d"];

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};

export const RANGE_CAPTIONS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function formatSuccessRate(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDurationMs(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value / 1000).toFixed(1)}s`;
}

export function buildAnalyticsQuery(
  basePath: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildAnalyticsDashboardQuery(
  basePath: string,
  options: {
    range?: AnalyticsRange;
    project_id?: string;
    limit?: number;
  },
): string {
  return buildAnalyticsQuery(basePath, {
    range: options.range ?? "30d",
    project_id: options.project_id,
    limit: options.limit?.toString(),
  });
}

export function getAnalyticsExportUrl(
  range: AnalyticsRange,
  projectId?: string | null,
): string {
  const params = new URLSearchParams({ range });
  if (projectId) params.set("project_id", projectId);
  return `/api/analytics/export?${params.toString()}`;
}

export function resolveActivityRangeDates(range: AnalyticsRange): {
  from: string;
  to: string;
} {
  const to = new Date();
  const from = new Date(to);
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}
