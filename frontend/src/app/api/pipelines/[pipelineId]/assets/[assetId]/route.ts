import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import { getAuthToken, UnauthenticatedError } from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ pipelineId: string; assetId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { pipelineId, assetId } = await context.params;
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/pipelines/${pipelineId}/assets/${assetId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      return new NextResponse(await response.text(), {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ?? "application/octet-stream",
        },
      });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
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
