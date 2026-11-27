"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { CommandPalette } from "@/components/app/command-palette";
import { SidebarToggleButton } from "@/components/app/sidebar-toggle-button";
import { UserMenu } from "@/components/app/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import type { User } from "@/lib/api/client";

const iconButtonClassName =
  "inline-flex size-8 items-center justify-center rounded-lg border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:bg-transparent dark:hover:bg-muted/60";

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-5 md:px-6">
      <SidebarToggleButton />
      <Link
        href="/app"
        aria-label="OCRFlow home"
        className="flex items-center md:hidden"
      >
        <SegmentMark className="size-[22px] text-foreground" />
      </Link>

      <div className="flex min-w-0 flex-1 justify-end md:justify-start">
        <CommandPalette responsive />
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/documentation"
          aria-label="Documentation"
          title="Documentation"
          className={`${iconButtonClassName} hidden sm:inline-flex`}
        >
          <BookOpen className="size-4" aria-hidden />
        </Link>
        <ThemeToggle
          persistToAccount
          className={`${iconButtonClassName} hover:border-transparent dark:hover:text-foreground [&_svg]:size-4`}
        />
        <div className="ml-1.5">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
