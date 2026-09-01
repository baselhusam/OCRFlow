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
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-7 shadow-[0_12px_32px_-24px_rgba(35,24,89,0.28)] sm:px-8">
        <div className="absolute top-0 right-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,var(--accent-tint),transparent_68%)] opacity-80" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="space-y-3">
            <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase">
              Personal workspace
            </p>
            <h1 className="text-[34px] font-extrabold leading-none tracking-[-0.04em] text-foreground sm:text-[40px]">
              Account &amp; settings
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-5 text-muted-foreground sm:text-right">
            Manage your profile, workspace preferences, and account security.
          </p>
        </div>
      </header>

      <AccountIdentityCard user={user} />

      <div className="inline-flex w-full gap-1 rounded-xl border border-border bg-secondary/35 p-1 sm:w-auto">
        {TAB_OPTIONS.map((tab) => {
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
      {activeTab === "preferences" ? <AccountPreferencesTab user={user} /> : null}
      {activeTab === "security" ? <AccountSecurityTab /> : null}
    </div>
  );
}
