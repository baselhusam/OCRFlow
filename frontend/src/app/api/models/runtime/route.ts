import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api/client";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { cookies } from "next/headers";

/**
 * Same-origin proxy for OCR provider runtime status.
 * Keeps the browser off the backend origin while the canvas polls.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiUrl()}/api/v1/models/runtime`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      let detail = "Runtime status unavailable";
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        // ignore
      }
      return NextResponse.json({ detail }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
