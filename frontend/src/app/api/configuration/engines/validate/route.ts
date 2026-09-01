import { NextResponse } from "next/server";

import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

export async function POST(request: Request) {
  try {
    const { data } = await authenticatedApiFetch("/api/v1/admin/engines/validate", {
      method: "POST",
      body: JSON.stringify(await request.json()),
    });
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
