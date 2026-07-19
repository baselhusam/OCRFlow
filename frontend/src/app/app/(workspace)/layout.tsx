import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { authenticatedApiFetch, UnauthenticatedError } from "@/lib/api/server";
import type { User } from "@/lib/api/client";

async function getCurrentUser(): Promise<User> {
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

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return <AppShell user={user}>{children}</AppShell>;
}
