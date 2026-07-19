import type { Project, ProjectList, ProjectStatus } from "@/lib/api/client";

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

export async function listProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects", {
    credentials: "include",
  });
  const data = await parseJsonResponse<ProjectList>(response);
  return data.items;
}

export async function createProject(
  name: string,
  description?: string,
  options?: { icon?: string; color?: string },
): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      description,
      icon: options?.icon,
      color: options?.color,
    }),
  });
  return parseJsonResponse<Project>(response);
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}`, {
    credentials: "include",
  });
  return parseJsonResponse<Project>(response);
}

export type UpdateProjectPayload = {
  name?: string;
  description?: string | null;
  graph?: Record<string, unknown>;
  icon?: string;
  color?: string;
  is_archived?: boolean;
  status?: ProjectStatus;
};

export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Project>(response);
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse<void>(response);
}
