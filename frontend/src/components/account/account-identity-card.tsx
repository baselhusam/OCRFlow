import { BadgeCheck, Shield } from "lucide-react";

import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";
import type { User } from "@/lib/api/client";
import {
  getUserAvatarInitial,
  getUserDisplayName,
} from "@/lib/auth/display-name";
import { getRoleBadgeClassName, getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

type AccountIdentityCardProps = {
  user: User;
};

function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(createdAt));
}

export function AccountIdentityCard({ user }: AccountIdentityCardProps) {
  const displayName = getUserDisplayName(user);
  const legalName = user.full_name?.trim() || displayName;

  return (
    <div
      className={cn(
        dashboardStatCardClassName,
        "relative isolate flex flex-wrap items-center gap-5 overflow-hidden px-6 py-6 sm:gap-7 sm:px-7",
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
      <div className="relative shrink-0">
        <span className="flex size-[76px] items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-[0_12px_24px_-14px_rgba(91,46,239,0.85)] sm:size-[84px]">
          {getUserAvatarInitial(user)}
        </span>
      </div>

      <div className="min-w-[200px] flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-foreground">
            {legalName}
          </h2>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              getRoleBadgeClassName(user.role),
            )}
          >
            <Shield className="size-3" aria-hidden />
            {getRoleLabel(user.role)}
          </span>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground sm:text-[13px]">
          {user.email}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Member since {formatMemberSince(user.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/45 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <BadgeCheck className="size-3.5 text-primary" aria-hidden />
        Workspace profile
      </div>
    </div>
  );
}
