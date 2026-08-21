export type PipelineRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PipelineRun = {
  id: string;
  pipeline_id: string;
  owner_id: string;
  status: PipelineRunStatus;
  task_id: string | null;
  input_asset_id: string | null;
  input_wire_kind: string | null;
  result: Record<string, unknown> | null;
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

export type PipelineRunList = {
  items: PipelineRun[];
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function startPipelineRun(
  pipelineId: string,
  payload: { asset_id: string; project_id?: string },
): Promise<PipelineRun> {
  const response = await fetch(`/api/pipelines/${pipelineId}/runs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<PipelineRun>(response);
}

export async function listPipelineRuns(
  pipelineId: string,
): Promise<PipelineRun[]> {
  const response = await fetch(`/api/pipelines/${pipelineId}/runs`, {
    credentials: "include",
  });
  const data = await parseJsonResponse<PipelineRunList>(response);
  return data.items;
}

export async function getPipelineRun(
  pipelineId: string,
  runId: string,
): Promise<PipelineRun> {
  const response = await fetch(
    `/api/pipelines/${pipelineId}/runs/${runId}`,
    { credentials: "include" },
  );
  return parseJsonResponse<PipelineRun>(response);
}

export async function cancelPipelineRun(
  pipelineId: string,
  runId: string,
): Promise<PipelineRun> {
  const response = await fetch(
    `/api/pipelines/${pipelineId}/runs/${runId}/cancel`,
    { method: "POST", credentials: "include" },
  );
  return parseJsonResponse<PipelineRun>(response);
}
