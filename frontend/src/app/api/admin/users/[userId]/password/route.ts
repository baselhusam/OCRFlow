import { NextResponse } from "next/server";

import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { ApiRequestError } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const body = await request.json();
    await authenticatedApiFetch(`/api/v1/admin/users/${userId}/password`, {
      method: "POST",
      body: JSON.stringify(body),
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
