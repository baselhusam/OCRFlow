import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import { getAuthToken, UnauthenticatedError } from "@/lib/api/server";

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const token = await getAuthToken();
    const response = await fetch(`${getApiUrl()}/api/v1/analytics/export${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { detail: detail || "Export failed" },
        { status: response.status },
      );
    }

    const csv = await response.text();
    const contentDisposition =
      response.headers.get("Content-Disposition") ??
      'attachment; filename="ocrflow-analytics.csv"';

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}
