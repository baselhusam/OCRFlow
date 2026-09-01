import { NextResponse } from "next/server";

import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

type Context = { params: Promise<{ engineId: string }> };

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

export async function PATCH(request: Request, context: Context) {
  try {
    const { engineId } = await context.params;
    const { data } = await authenticatedApiFetch(`/api/v1/admin/engines/${engineId}`, {
      method: "PATCH",
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json(data);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { engineId } = await context.params;
    await authenticatedApiFetch(`/api/v1/admin/engines/${engineId}`, {
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
