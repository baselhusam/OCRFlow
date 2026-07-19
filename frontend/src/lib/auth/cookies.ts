export const AUTH_COOKIE_NAME = "ocrflow_token";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;

export function getAuthCookieOptions(maxAge = ACCESS_TOKEN_MAX_AGE_SECONDS) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: isProduction,
  };
}
