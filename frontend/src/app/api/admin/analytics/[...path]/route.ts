import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { path } = await context.params;
    const apiPath = `/api/v1/admin/analytics/${(path ?? []).join("/")}`;
    const query = new URL(request.url).search;

    const { data, response } = await authenticatedApiFetch<unknown>(
      `${apiPath}${query}`,
    );

    if (apiPath.endsWith("/export")) {
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") ?? "text/csv",
          ...(disposition ? { "Content-Disposition": disposition } : {}),
        },
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 403 });
  }
}
