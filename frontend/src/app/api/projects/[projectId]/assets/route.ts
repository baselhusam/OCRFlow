import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import {
  getAuthToken,
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "file is required" }, { status: 400 });
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/projects/${projectId}/assets`,
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

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}
