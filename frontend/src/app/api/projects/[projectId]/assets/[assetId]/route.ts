import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ projectId: string; assetId: string }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId, assetId } = await context.params;
    const token = await import("@/lib/api/server").then((m) => m.getAuthToken());
    const apiUrl = (await import("@/lib/api/client")).getApiUrl();

    const response = await fetch(
      `${apiUrl}/api/v1/projects/${projectId}/assets/${assetId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return new NextResponse(body, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream" },
      });
    }

    const data = await response.arrayBuffer();
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Request failed" },
      { status: 400 },
    );
  }
}
