import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import { getAuthToken, UnauthenticatedError } from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ pipelineId: string }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry) => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ detail: "files are required" }, { status: 400 });
    }

    const uploadForm = new FormData();
    for (const file of files) {
      uploadForm.append("files", file);
    }

    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}/assets/batch`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      },
    );

    if (!response.ok) {
      let detail = "Batch upload failed";
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
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}
