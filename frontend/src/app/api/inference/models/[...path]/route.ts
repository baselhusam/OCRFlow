import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ANALYTICS_HEADERS = [
  "x-ocrflow-project-id",
  "x-ocrflow-node-id",
  "x-ocrflow-run-kind",
] as const;

function unauthenticatedResponse() {
  const response = NextResponse.json(
    { detail: "Your session expired. Sign in again to continue." },
    { status: 401 },
  );
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { path } = await context.params;
    if (!path?.length) {
      return NextResponse.json({ detail: "Model path required" }, { status: 400 });
    }

    const apiPath = `/api/v1/models/${path.join("/")}`;
    const body = await request.json();

    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    for (const header of ANALYTICS_HEADERS) {
      const value = request.headers.get(header);
      if (value) {
        forwardHeaders[header] = value;
      }
    }

    const { data, response } = await authenticatedApiFetch<Record<string, unknown>>(
      apiPath,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: forwardHeaders,
      },
    );

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Inference failed" },
      { status: 400 },
    );
  }
}
