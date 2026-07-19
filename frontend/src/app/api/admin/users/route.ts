import { NextResponse } from "next/server";

import type { AdminUserList } from "@/lib/api/admin";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<AdminUserList>("/api/v1/admin/users");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = await authenticatedApiFetch("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 403 });
  }
}
