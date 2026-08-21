import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import type { PipelineJob } from "@/lib/api/jobs";

type RouteContext = {
  params: Promise<{ pipelineId: string }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const detail = error instanceof Error ? error.message : "Request failed";
  const status = detail.toLowerCase().includes("not found") ? 404 : 400;
  return NextResponse.json({ detail }, { status });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const body = await request.json();
    const { data, response } = await authenticatedApiFetch<PipelineJob>(
      `/api/v1/pipelines/${pipelineId}/jobs`,
      {
        method: "POST",
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
