const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type ApiError = {
  detail: string;
};

export type UserRole = "admin" | "view_admin" | "user";

export type UserPreferences = {
  appearance: "system" | "light" | "dark";
  default_output_format: "json" | "csv" | "markdown";
  default_ocr_model: string;
  auto_run_on_upload: boolean;
  email_on_run_fail: boolean;
  weekly_summary: boolean;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  role: UserRole;
  preferences: UserPreferences;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectStatus = "draft" | "idle" | "running" | "live" | "failed";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  graph: Record<string, unknown>;
  icon: string;
  color: string;
  is_archived: boolean;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectList = {
  items: Project[];
};

export type ProjectRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ProjectRun = {
  id: string;
  project_id: string;
  owner_id: string;
  status: ProjectRunStatus;
  task_id: string | null;
  current_node_id: string | null;
  completed_count: number;
  total_count: number;
  error: string | null;
  error_code: string | null;
  error_context: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectRunList = {
  items: ProjectRun[];
};

export type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  graph: Record<string, unknown>;
  input_wire_kind: string | null;
  output_wire_kind: string | null;
  input_type_label: string | null;
  output_type_label: string | null;
  accent_color: string;
  is_archived: boolean;
  has_logo: boolean;
  created_at: string;
  updated_at: string;
};

export type PipelineList = {
  items: Pipeline[];
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export function getApiUrl(): string {
  return API_URL.replace(/\/$/, "");
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const body = (await response.json()) as ApiError | { detail: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return { data: undefined as T, response };
  }

  const data = (await response.json()) as T;
  return { data, response };
}
