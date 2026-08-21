import { Shield } from "lucide-react";

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
        "flex flex-wrap items-center gap-6 px-7 py-6 sm:gap-7",
      )}
    >
      <div className="relative shrink-0">
        <span className="flex size-[88px] items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary shadow-[0_0_0_3px_var(--accent-tint)]">
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
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {user.email} · member since {formatMemberSince(user.created_at)}
        </p>
      </div>

      <button
        type="button"
        disabled
        className="rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground"
      >
        Change photo
      </button>
    </div>
  );
}
