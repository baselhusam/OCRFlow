import { NextResponse } from "next/server";

import type { ProjectRun, ProjectRunList } from "@/lib/api/client";
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
  const status = detail.includes("not found") ? 404 : 400;
  return NextResponse.json({ detail }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const { data } = await authenticatedApiFetch<ProjectRunList>(
      `/api/v1/projects/${projectId}/runs`,
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const { data, response } = await authenticatedApiFetch<ProjectRun>(
      `/api/v1/projects/${projectId}/runs`,
      { method: "POST" },
    );
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}
