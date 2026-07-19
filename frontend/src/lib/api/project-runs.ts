import type { ProjectRun, ProjectRunList } from "@/lib/api/client";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
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

export async function startProjectRun(projectId: string): Promise<ProjectRun> {
  const response = await fetch(`/api/projects/${projectId}/runs`, {
    method: "POST",
    credentials: "include",
  });
  return parseJsonResponse<ProjectRun>(response);
}

export async function getProjectRun(
  projectId: string,
  runId: string,
): Promise<ProjectRun> {
  const response = await fetch(`/api/projects/${projectId}/runs/${runId}`, {
    credentials: "include",
  });
  return parseJsonResponse<ProjectRun>(response);
}

export async function listProjectRuns(projectId: string): Promise<ProjectRun[]> {
  const response = await fetch(`/api/projects/${projectId}/runs`, {
    credentials: "include",
  });
  const data = await parseJsonResponse<ProjectRunList>(response);
  return data.items;
}

export async function cancelProjectRun(
  projectId: string,
  runId: string,
): Promise<ProjectRun> {
  const response = await fetch(`/api/projects/${projectId}/runs/${runId}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  return parseJsonResponse<ProjectRun>(response);
}
