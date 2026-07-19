import { NextResponse } from "next/server";

import type { Project, ProjectList } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

function unauthenticatedResponse() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const detail = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ detail }, { status: 400 });
}

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<ProjectList>("/api/v1/projects");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return unauthenticatedResponse();
    }
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; description?: string };
    const { data, response } = await authenticatedApiFetch<Project>(
      "/api/v1/projects",
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
    return errorResponse(error);
  }
}
