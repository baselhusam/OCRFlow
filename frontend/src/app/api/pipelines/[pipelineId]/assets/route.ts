import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import { getAuthToken, UnauthenticatedError } from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ pipelineId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { pipelineId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "file is required" }, { status: 400 });
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}/assets`,
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
        // Preserve the fallback message for non-JSON backend errors.
      }
      return NextResponse.json({ detail }, { status: response.status });
    }

    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Request failed" },
      { status: 400 },
    );
  }
}
