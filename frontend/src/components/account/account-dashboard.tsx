"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { AccountIdentityCard } from "@/components/account/account-identity-card";
import { AccountPreferencesTab } from "@/components/account/account-preferences-tab";
import { AccountProfileTab } from "@/components/account/account-profile-tab";
import { AccountSecurityTab } from "@/components/account/account-security-tab";
import { AccountApiKeysTab } from "@/components/account/account-api-keys-tab";
import type { ApiKey } from "@/lib/api/account";
import type { User } from "@/lib/api/client";
import type { ModelCatalogEntry } from "@/lib/canvas/types";
import { canUseDeveloperApi } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export type AccountTab = "profile" | "preferences" | "security" | "api-keys";

type AccountDashboardProps = {
  user: User;
  initialTab: AccountTab;
  apiKeys: ApiKey[];
  ocrModels: ModelCatalogEntry[];
};

const TAB_OPTIONS: { key: AccountTab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "preferences", label: "Preferences" },
  { key: "security", label: "Security" },
];

export function AccountDashboard({
  user,
  initialTab,
  apiKeys,
  ocrModels,
}: AccountDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabs = canUseDeveloperApi(user)
    ? [...TAB_OPTIONS, { key: "api-keys" as AccountTab, label: "API keys" }]
    : TAB_OPTIONS;
  const activeTab = tabs.some((tab) => tab.key === initialTab) ? initialTab : "profile";

  function setTab(tab: AccountTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/app/account?${params.toString()}`);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Account & settings"
        description="Manage your profile, workspace preferences, and account security."
      />

      <AccountIdentityCard user={user} />

      <div className="inline-flex w-full gap-1 rounded-xl border border-border bg-secondary/35 p-1 sm:w-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,color,box-shadow]",
                active
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(20,18,37,0.08)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" ? <AccountProfileTab user={user} /> : null}
      {activeTab === "preferences" ? (
        <AccountPreferencesTab user={user} ocrModels={ocrModels} />
      ) : null}
      {activeTab === "security" ? <AccountSecurityTab /> : null}
      {activeTab === "api-keys" && canUseDeveloperApi(user) ? <AccountApiKeysTab initialKeys={apiKeys} /> : null}
    </div>
  );
}
