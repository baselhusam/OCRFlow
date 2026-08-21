import { NextResponse } from "next/server";

import type { Pipeline, PipelineList } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const detail = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ detail }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("include_archived") === "true";
    const query = includeArchived ? "?include_archived=true" : "";
    const { data } = await authenticatedApiFetch<PipelineList>(
      `/api/v1/pipelines${query}`,
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      accent_color?: string;
      graph?: Record<string, unknown>;
    };
    const { data, response } = await authenticatedApiFetch<Pipeline>(
      "/api/v1/pipelines",
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
