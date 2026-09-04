import { NextResponse } from "next/server";

import type { ApiKeyCreated, ApiKeyList } from "@/lib/api/account";
import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

function errorResponse(error: unknown) {
  if (error instanceof UnauthenticatedError) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  if (error instanceof ApiRequestError) return NextResponse.json({ detail: error.message }, { status: error.status });
  return NextResponse.json({ detail: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
}

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<ApiKeyList>("/api/v1/account/api-keys");
    return NextResponse.json(data);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, response } = await authenticatedApiFetch<ApiKeyCreated>("/api/v1/account/api-keys", { method: "POST", body: JSON.stringify(body) });
    return NextResponse.json(data, { status: response.status });
  } catch (error) { return errorResponse(error); }
}
