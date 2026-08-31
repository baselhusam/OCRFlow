import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { ApiRequestError } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const body = await request.json();
    const { data } = await authenticatedApiFetch(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 403 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    await authenticatedApiFetch(`/api/v1/admin/users/${userId}`, {
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 403 });
  }
}
