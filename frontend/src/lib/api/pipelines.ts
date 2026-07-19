import type { Pipeline, PipelineList } from "@/lib/api/client";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (
        body.detail &&
        typeof body.detail === "object" &&
        "message" in body.detail
      ) {
        detail = String((body.detail as { message: string }).message);
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listPipelines(
  includeArchived = false,
): Promise<Pipeline[]> {
  const params = includeArchived ? "?include_archived=true" : "";
  const response = await fetch(`/api/pipelines${params}`, {
    credentials: "include",
  });
  const data = await parseJsonResponse<PipelineList>(response);
  return data.items;
}

export async function createPipeline(
  name: string,
  description?: string,
  options?: { accent_color?: string },
): Promise<Pipeline> {
  const response = await fetch("/api/pipelines", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      description,
      accent_color: options?.accent_color,
    }),
  });
  return parseJsonResponse<Pipeline>(response);
}

export async function getPipeline(pipelineId: string): Promise<Pipeline> {
  const response = await fetch(`/api/pipelines/${pipelineId}`, {
    credentials: "include",
  });
  return parseJsonResponse<Pipeline>(response);
}

export type UpdatePipelinePayload = {
  name?: string;
  description?: string | null;
  graph?: Record<string, unknown>;
  accent_color?: string;
  is_archived?: boolean;
};

export async function updatePipeline(
  pipelineId: string,
  payload: UpdatePipelinePayload,
): Promise<Pipeline> {
  const response = await fetch(`/api/pipelines/${pipelineId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Pipeline>(response);
}

export async function deletePipeline(pipelineId: string): Promise<void> {
  const response = await fetch(`/api/pipelines/${pipelineId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse<void>(response);
}

export function getPipelineLogoUrl(pipelineId: string): string {
  return `/api/pipelines/${pipelineId}/logo`;
}

export async function uploadPipelineLogo(
  pipelineId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/pipelines/${pipelineId}/logo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  await parseJsonResponse<void>(response);
}

export async function deletePipelineLogo(pipelineId: string): Promise<void> {
  const response = await fetch(`/api/pipelines/${pipelineId}/logo`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse<void>(response);
}

/** Pipelines valid for use in project canvas (have derived I/O). */
export function isPipelineReady(pipeline: Pipeline): boolean {
  return (
    Boolean(pipeline.input_wire_kind) &&
    Boolean(pipeline.output_wire_kind) &&
    pipeline.graph.nodes !== undefined &&
    Array.isArray(pipeline.graph.nodes) &&
    pipeline.graph.nodes.length >= 2
  );
}
