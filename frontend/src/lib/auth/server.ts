import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "@/lib/auth/cookies";
import { getApiUrl } from "@/lib/api/client";

type TokenResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    is_active: boolean;
    created_at: string;
  };
};

export async function proxyAuthAndSetCookie(
  path: string,
  body: unknown,
): Promise<NextResponse> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | TokenResponse
    | { detail?: unknown };

  if (!response.ok) {
    const errorPayload = payload as { detail?: unknown };
    const detail =
      typeof errorPayload.detail === "string"
        ? errorPayload.detail
        : "Authentication failed";
    return NextResponse.json({ detail }, { status: response.status });
  }

  const data = payload as TokenResponse;
  const nextResponse = NextResponse.json(
    { user: data.user },
    { status: response.status },
  );
  nextResponse.cookies.set(
    AUTH_COOKIE_NAME,
    data.access_token,
    getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
  );
  return nextResponse;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
