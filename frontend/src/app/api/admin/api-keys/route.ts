import { NextResponse } from "next/server";

import type { ApiKeyList } from "@/lib/api/account";
import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<ApiKeyList>("/api/v1/admin/api-keys");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    if (error instanceof ApiRequestError) return NextResponse.json({ detail: error.message }, { status: error.status });
    return NextResponse.json({ detail: error instanceof Error ? error.message : "Request failed" }, { status: 403 });
  }
}
