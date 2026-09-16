import { NextResponse } from "next/server";

import type { User } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "@/lib/auth/cookies";

type RefreshResponse = { access_token: string; user: User };

/**
 * Re-issues the session cookie while the current token is still valid.
 * The gateway rejects expired or revoked tokens, so this can only extend a
 * session that is already live.
 */
export async function POST() {
  try {
    const { data } = await authenticatedApiFetch<RefreshResponse>(
      "/api/v1/auth/refresh",
      { method: "POST" },
    );
    const response = NextResponse.json({ user: data.user });
    response.cookies.set(
      AUTH_COOKIE_NAME,
      data.access_token,
      getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
    );
    return response;
  } catch (error) {
    const status = error instanceof UnauthenticatedError ? 401 : 400;
    return NextResponse.json(
      { detail: "Session could not be refreshed" },
      { status },
    );
  }
}
