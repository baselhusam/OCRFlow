import { NextResponse } from "next/server";

import type { Member } from "@/lib/api/account";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const body = await request.json();
    const { data } = await authenticatedApiFetch<Member>(
      `/api/v1/members/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail: message }, { status: 403 });
  }
}
