import { NextResponse } from "next/server";

import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

type Context = { params: Promise<{ engineId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { engineId } = await context.params;
    const { data } = await authenticatedApiFetch(
      `/api/v1/admin/engines/${engineId}/validate`,
      { method: "POST" },
    );
    return NextResponse.json(data);
  } catch (error) {
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
}
