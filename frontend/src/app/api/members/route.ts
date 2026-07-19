import { NextResponse } from "next/server";

import type { MemberList } from "@/lib/api/account";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

export async function GET() {
  try {
    const { data } = await authenticatedApiFetch<MemberList>("/api/v1/members");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 403 });
  }
}
