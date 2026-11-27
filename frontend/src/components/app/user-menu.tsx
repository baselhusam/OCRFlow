"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  KeyRound,
  Keyboard,
  LogOut,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/api/client";
import {
  getUserAvatarInitial,
  getUserDisplayName,
} from "@/lib/auth/display-name";
import { canUseDeveloperApi, getRoleLabel } from "@/lib/auth/roles";
import { logout } from "@/lib/auth/session";
import { OPEN_SHORTCUTS_EVENT } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

const itemClassName = "gap-2.5 rounded-md px-2 py-1.5 text-[13px]";

export function UserAvatar({
  user,
  className,
}: {
  user: User;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]",
        className,
      )}
      aria-hidden
    >
      {getUserAvatarInitial(user)}
    </span>
  );
}

/** Avatar button in the top bar: account links, shortcuts, and sign out. */
export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const displayName = getUserDisplayName(user);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayName}`}
        className="rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-primary/50 data-popup-open:ring-2 data-popup-open:ring-primary/30"
      >
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5">
        <div className="flex items-center gap-3 px-2 pt-1.5 pb-2.5">
          <UserAvatar user={user} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-primary uppercase">
            {getRoleLabel(user.role)}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClassName}
          render={<Link href="/app/account" />}
        >
          <UserRound aria-hidden />
          Account & profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClassName}
          render={<Link href="/app/account?tab=preferences" />}
        >
          <SlidersHorizontal aria-hidden />
          Preferences
        </DropdownMenuItem>
        {canUseDeveloperApi(user) ? (
          <DropdownMenuItem
            className={itemClassName}
            render={<Link href="/app/account?tab=api-keys" />}
          >
            <KeyRound aria-hidden />
            API keys
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))}
        >
          <Keyboard aria-hidden />
          Keyboard shortcuts
          <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">
            ?
          </kbd>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClassName}
          render={<Link href="/documentation" />}
        >
          <BookOpen aria-hidden />
          Documentation
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => void handleLogout()}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
