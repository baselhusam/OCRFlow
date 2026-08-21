import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import type { PipelineJob } from "@/lib/api/jobs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const detail = error instanceof Error ? error.message : "Request failed";
  const status = detail.toLowerCase().includes("not found") ? 404 : 400;
  return NextResponse.json({ detail }, { status });
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const { data, response } = await authenticatedApiFetch<PipelineJob>(
      `/api/v1/jobs/${jobId}/cancel`,
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
