import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";

function isExpiredJwt(token: string): boolean {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return true;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const hasValidToken = Boolean(token && !isExpiredJwt(token));
  const { pathname } = request.nextUrl;

  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  const isStudioRoute = pathname === "/studio" || pathname.startsWith("/studio/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if ((isAppRoute || isStudioRoute) && !hasValidToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (isAuthRoute && hasValidToken) {
    const next = request.nextUrl.searchParams.get("next") ?? "/app";
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/studio/:path*", "/login", "/signup"],
};
