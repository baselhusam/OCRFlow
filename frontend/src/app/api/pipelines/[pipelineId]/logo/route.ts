import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { getApiUrl } from "@/lib/api/client";
import { getAuthToken } from "@/lib/api/server";

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}/logo`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) {
      return NextResponse.json(
        { detail: "Logo not found" },
        { status: response.status },
      );
    }
    const data = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";
    return new NextResponse(data, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "File is required" }, { status: 400 });
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}/logo`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      },
    );
    if (!response.ok) {
      let detail = "Upload failed";
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        // ignore
      }
      return NextResponse.json({ detail }, { status: response.status });
    }
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const { response } = await authenticatedApiFetch<void>(
      `/api/v1/pipelines/${pipelineId}/logo`,
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
