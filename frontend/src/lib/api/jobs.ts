import type {
  PipelineRun,
} from "@/lib/api/pipeline-runs";

export type PipelineJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "partial"
  | "cancelled";

export type PipelineJobSummary = {
  id: string;
  pipeline_id: string;
  pipeline_name: string | null;
  owner_id: string;
  status: PipelineJobStatus;
  document_count: number;
  succeeded_count: number;
  failed_count: number;
  cancelled_count: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PipelineJob = PipelineJobSummary & {
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

export async function listJobs(): Promise<PipelineJobSummary[]> {
  const response = await fetch("/api/jobs", { credentials: "include" });
  const data = await parseJsonResponse<{ items: PipelineJobSummary[] }>(response);
  return data.items;
}

export async function getJob(jobId: string): Promise<PipelineJob> {
  const response = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
  return parseJsonResponse<PipelineJob>(response);
}

export async function cancelJob(jobId: string): Promise<PipelineJob> {
  const response = await fetch(`/api/jobs/${jobId}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  return parseJsonResponse<PipelineJob>(response);
}

export async function startPipelineJob(
  pipelineId: string,
  assetIds: string[],
): Promise<PipelineJob> {
  const response = await fetch(`/api/pipelines/${pipelineId}/jobs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_ids: assetIds }),
  });
  return parseJsonResponse<PipelineJob>(response);
}

export async function uploadPipelineAssetsBatch(
  pipelineId: string,
  files: File[],
): Promise<{ items: Array<{ asset_id: string; filename: string }> }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const response = await fetch(`/api/pipelines/${pipelineId}/assets/batch`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return parseJsonResponse(response);
}

export function isJobActive(status: PipelineJobStatus): boolean {
  return status === "queued" || status === "running";
}
