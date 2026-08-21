import type { Pipeline } from "@/lib/api/client";

export class UnauthenticatedTemplateError extends Error {
  constructor() {
    super("Sign in to add this template to your pipelines");
    this.name = "UnauthenticatedTemplateError";
  }
}

export function templateAddLoginPath(slug: string): string {
  const next = `/templates/${slug}?add=1`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export async function addTemplateToAccount(slug: string): Promise<Pipeline> {
  const response = await fetch(`/api/templates/${encodeURIComponent(slug)}/add`, {
    method: "POST",
    credentials: "include",
  });

  if (response.status === 401) {
    throw new UnauthenticatedTemplateError();
  }

  if (!response.ok) {
    let detail = "Could not add this template";
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

  return (await response.json()) as Pipeline;
}
