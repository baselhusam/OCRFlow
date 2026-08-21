import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import {
  getAuthToken,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const token = await getAuthToken();
    const response = await fetch(
      `${getApiUrl()}/api/v1/projects/${projectId}/batch-runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      let detail = "Batch run failed";
      try {
        const payload = (await response.json()) as { detail?: string };
        if (payload.detail) detail = payload.detail;
      } catch {
        // ignore
      }
      return NextResponse.json({ detail }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}
