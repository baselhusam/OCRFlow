import { Suspense } from "react";

import { AccountDashboard, type AccountTab } from "@/components/account/account-dashboard";
import type { User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";

const VALID_TABS = new Set<AccountTab>(["profile", "preferences", "security"]);

type AccountPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const tabParam = params.tab;
  const initialTab =
    tabParam && VALID_TABS.has(tabParam as AccountTab)
      ? (tabParam as AccountTab)
      : "profile";

  const { data: user } = await authenticatedApiFetch<User>("/api/v1/auth/me");

  return (
    <main className="mx-auto w-full max-w-[980px] flex-1 px-6 py-11 md:px-12">
      <Suspense>
        <AccountDashboard user={user} initialTab={initialTab} />
      </Suspense>
    </main>
  );
}
