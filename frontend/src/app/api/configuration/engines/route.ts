import { NextResponse } from "next/server";

import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

function failure(error: unknown) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }
  if (error instanceof ApiRequestError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { detail: error instanceof Error ? error.message : "Request failed" },
    { status: 400 },
  );
}

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch("/api/v1/admin/engines");
    return NextResponse.json(data);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { data } = await authenticatedApiFetch("/api/v1/admin/engines", {
      method: "POST",
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
