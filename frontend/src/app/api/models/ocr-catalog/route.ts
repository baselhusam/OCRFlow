import { NextResponse } from "next/server";

import { ApiRequestError } from "@/lib/api/client";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";

/** Same-origin proxy for OCR models discovered on validated connections. */
export async function GET() {
  try {
    const { data } = await authenticatedApiFetch("/api/v1/models/ocr-catalog");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
