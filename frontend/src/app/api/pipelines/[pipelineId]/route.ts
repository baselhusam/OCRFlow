import { NextResponse } from "next/server";

import type { Pipeline } from "@/lib/api/client";
import { getApiUrl } from "@/lib/api/client";
import {
  getAuthToken,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ pipelineId: string }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      graph?: Record<string, unknown>;
      accent_color?: string;
      is_archived?: boolean;
    };
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );
    const responseBody = (await response.json().catch(() => ({}))) as Pipeline;
    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}
