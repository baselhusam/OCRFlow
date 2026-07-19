import type { User } from "@/lib/api/client";

export type AuthResult = {
  user: User;
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function parseAuthResponse(response: Response): Promise<AuthResult> {
  const body = (await response.json()) as { user?: User; detail?: string };

  if (!response.ok) {
    throw new AuthError(
      typeof body.detail === "string" ? body.detail : "Authentication failed",
    );
  }

  if (!body.user) {
    throw new AuthError("Authentication failed");
  }

  return { user: body.user };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseAuthResponse(response);
}

export async function signup(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResult> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName || null,
    }),
  });

  return parseAuthResponse(response);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe(): Promise<User | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load session");
  }

  return (await response.json()) as User;
}
