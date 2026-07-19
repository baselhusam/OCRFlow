import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { path } = await context.params;
    const apiPath = `/api/v1/analytics/${(path ?? []).join("/")}`;
    const query = new URL(request.url).search;

    const { data, response } = await authenticatedApiFetch<unknown>(
      `${apiPath}${query}`,
    );

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 400 });
  }
}
