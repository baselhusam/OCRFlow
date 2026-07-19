import { NextResponse } from "next/server";

import type { User } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<User>("/api/v1/auth/me");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }
}
