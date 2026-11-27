import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/app/page-header";
import { AccountDashboard, type AccountTab } from "@/components/account/account-dashboard";
import type { User } from "@/lib/api/client";
import { fetchModelCatalog } from "@/lib/api/models";
import { authenticatedApiFetch } from "@/lib/api/server";
import { filterDoneModels } from "@/lib/canvas/model-utils";
import type { ApiKeyList } from "@/lib/api/account";
import { canUseDeveloperApi } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Account & settings",
};

const VALID_TABS = new Set<AccountTab>(["profile", "preferences", "security", "api-keys"]);

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

  const [{ data: user }, catalog] = await Promise.all([
    authenticatedApiFetch<User>("/api/v1/auth/me"),
    fetchModelCatalog().catch(() => []),
  ]);
  const apiKeys = canUseDeveloperApi(user)
    ? (await authenticatedApiFetch<ApiKeyList>("/api/v1/account/api-keys")).data.items
    : [];
  const ocrModels = filterDoneModels(catalog).filter(
    (model) => model.category === "text_recognition",
  );

  return (
    <PageContainer width="narrow">
      <Suspense>
        <AccountDashboard
          user={user}
          initialTab={initialTab}
          apiKeys={apiKeys}
          ocrModels={ocrModels}
        />
      </Suspense>
    </PageContainer>
  );
}
