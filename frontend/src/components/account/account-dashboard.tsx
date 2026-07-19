"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { AccountIdentityCard } from "@/components/account/account-identity-card";
import { AccountPreferencesTab } from "@/components/account/account-preferences-tab";
import { AccountProfileTab } from "@/components/account/account-profile-tab";
import { AccountSecurityTab } from "@/components/account/account-security-tab";
import type { User } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export type AccountTab = "profile" | "preferences" | "security";

type AccountDashboardProps = {
  user: User;
  initialTab: AccountTab;
};

const TAB_OPTIONS: { key: AccountTab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "preferences", label: "Preferences" },
  { key: "security", label: "Security" },
];

export function AccountDashboard({ user, initialTab }: AccountDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = TAB_OPTIONS.some((tab) => tab.key === initialTab)
    ? initialTab
    : "profile";

  function setTab(tab: AccountTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/app/account?${params.toString()}`);
  }

  return (
    <div className="space-y-9">
      <header className="space-y-3.5">
        <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
          Account
        </p>
        <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
          Account &amp; settings
        </h1>
      </header>

      <AccountIdentityCard user={user} />

      <div className="flex gap-7 border-b border-border">
        {TAB_OPTIONS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={cn(
                "pb-3.5 text-sm font-semibold transition-colors",
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" ? <AccountProfileTab user={user} /> : null}
      {activeTab === "preferences" ? <AccountPreferencesTab user={user} /> : null}
      {activeTab === "security" ? <AccountSecurityTab /> : null}
    </div>
  );
}
