import { NextResponse } from "next/server";

import type { Project } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const detail = error instanceof Error ? error.message : "Request failed";
  const status = detail === "Project not found" ? 404 : 400;
  return NextResponse.json({ detail }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const { data } = await authenticatedApiFetch<Project>(
      `/api/v1/projects/${projectId}`,
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      graph?: Record<string, unknown>;
      icon?: string;
      color?: string;
      is_archived?: boolean;
      status?: string;
    };
    const { data, response } = await authenticatedApiFetch<Project>(
      `/api/v1/projects/${projectId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const { response } = await authenticatedApiFetch<void>(
      `/api/v1/projects/${projectId}`,
      { method: "DELETE" },
    );
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}
