import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import type { PipelineJobSummary } from "@/lib/api/jobs";

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const detail = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ detail }, { status: 400 });
}

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<{ items: PipelineJobSummary[] }>(
      "/api/v1/jobs",
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}
