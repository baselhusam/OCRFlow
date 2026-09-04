import { NextResponse } from "next/server";

import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

export async function DELETE(_request: Request, context: { params: Promise<{ keyId: string }> }) {
  try {
    const { keyId } = await context.params;
    await authenticatedApiFetch(`/api/v1/account/api-keys/${keyId}`, { method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    if (error instanceof ApiRequestError) return NextResponse.json({ detail: error.message }, { status: error.status });
    return NextResponse.json({ detail: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
