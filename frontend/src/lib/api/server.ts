import { cookies } from "next/headers";

import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

export async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new UnauthenticatedError();
  }

  return token;
}

export async function authenticatedApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const token = await getAuthToken();

  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      throw new UnauthenticatedError();
    }
    throw error;
  }
}
