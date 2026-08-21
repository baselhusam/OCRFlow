"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { SidebarToggleButton } from "@/components/app/sidebar-toggle-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/session";

export function AppHeader() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-[73px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-9">
      <SidebarToggleButton />
      <div className="flex items-center gap-[18px]">
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="h-auto gap-2 rounded-lg border-border px-4 py-2 text-[13px] font-semibold hover:border-primary/40 hover:text-primary"
        >
          <LogOut className="size-[15px]" aria-hidden />
          Sign out
        </Button>
      </div>
    </header>
  );
}
