"use client";

import type { User } from "@/lib/api/client";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SessionKeepAlive } from "@/components/app/session-keep-alive";
import { WorkspaceKeyboardShortcuts } from "@/components/app/workspace-keyboard-shortcuts";
import { UserThemeSync } from "@/components/app/user-theme-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AppShellProps = {
  user: User;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <UserThemeSync user={user} />
      <SessionKeepAlive />
      <WorkspaceKeyboardShortcuts />
      <SidebarProvider
        className="min-h-svh flex-1"
        style={
          {
            "--sidebar-width": "15rem",
            "--sidebar-width-icon": "3.5rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar user={user} />
        <SidebarInset className="flex min-h-svh min-w-0 flex-1 flex-col">
          <AppHeader user={user} />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
