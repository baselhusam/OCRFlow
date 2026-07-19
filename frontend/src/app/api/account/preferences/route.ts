import { NextResponse } from "next/server";

import type { User } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { data } = await authenticatedApiFetch<User>("/api/v1/account/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
