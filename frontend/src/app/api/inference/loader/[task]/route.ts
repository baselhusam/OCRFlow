import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ task: string }>;
};

const TASK_PATHS: Record<string, string> = {
  pdf: "/api/v1/models/loader/pdf",
  image: "/api/v1/models/loader/image",
  "page-at": "/api/v1/models/loader/page-at",
};

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { task } = await context.params;
    const path = TASK_PATHS[task];
    if (!path) {
      return NextResponse.json({ detail: "Unknown loader task" }, { status: 404 });
    }

    const body = await request.json();
    const { data, response } = await authenticatedApiFetch<Record<string, unknown>>(
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
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
