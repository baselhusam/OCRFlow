import { redirect } from "next/navigation";

import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";
import type { User } from "@/lib/api/client";

async function requireUser(): Promise<User> {
  try {
    const { data } = await authenticatedApiFetch<User>("/api/v1/auth/me");
    return data;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/login?next=/app");
    }
    redirect("/login?next=/app");
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return children;
}
