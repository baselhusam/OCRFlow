"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cable,
  FileStack,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Shield,
} from "lucide-react";

import { SegmentMark } from "@/components/brand/segment-mark";
import type { User } from "@/lib/api/client";
import {
  getUserAvatarInitial,
  getUserDisplayName,
} from "@/lib/auth/display-name";
import { getRoleLabel, canAccessAdminPanel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const baseNavItems = [
  {
    title: "Dashboard",
    href: "/app",
    icon: LayoutDashboard,
    isActive: (pathname: string) => pathname === "/app",
  },
  {
    title: "Projects",
    href: "/app/projects",
    icon: FolderKanban,
    isActive: (pathname: string) => pathname.startsWith("/app/projects"),
  },
  {
    title: "Pipelines",
    href: "/app/pipelines",
    icon: GitBranch,
    isActive: (pathname: string) => pathname.startsWith("/app/pipelines"),
  },
  {
    title: "Jobs",
    href: "/app/jobs",
    icon: FileStack,
    isActive: (pathname: string) => pathname.startsWith("/app/jobs"),
  },
  {
    title: "Analytics",
    href: "/app/analytics",
    icon: BarChart3,
    isActive: (pathname: string) => pathname.startsWith("/app/analytics"),
  },
];

const adminNavItem = {
  title: "Admin Panel",
  href: "/app/admin?tab=users",
  icon: Shield,
  isActive: (pathname: string) => pathname === "/app/admin",
};

const configurationNavItem = {
  title: "Configuration",
  href: "/app/configuration",
  icon: Cable,
  isActive: (pathname: string) => pathname.startsWith("/app/configuration"),
};

type AppSidebarProps = {
  user: User;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const displayName = getUserDisplayName(user);
  const avatarInitial = getUserAvatarInitial(user);
  const accountActive = pathname.startsWith("/app/account");
  const navItems = canAccessAdminPanel(user)
    ? [...baseNavItems, configurationNavItem, adminNavItem]
    : baseNavItems;

  return (
    <Sidebar
      collapsible="icon"
      className="border-none [&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:border-[var(--workspace-sidebar-border)] [&_[data-slot=sidebar-inner]]:bg-[var(--workspace-sidebar-bg)] [&_[data-slot=sidebar-inner]]:text-[var(--workspace-sidebar-fg)]"
    >
      <SidebarHeader className="h-[73px] shrink-0 justify-center border-b border-[var(--workspace-sidebar-border)] px-[18px] py-[22px] group-data-[collapsible=icon]:px-2">
        <Link
          href="/app"
          aria-label="OCRFlow home"
          className="flex w-full min-w-0 items-center justify-center gap-[11px]"
        >
          <SegmentMark className="h-[26px] w-[26px] shrink-0 text-[var(--workspace-sidebar-fg)]" />
          <span className="truncate text-lg font-extrabold tracking-[-0.03em] text-[var(--workspace-sidebar-fg)] group-data-[collapsible=icon]:hidden">
            OCRFlow
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-3.5 group-data-[collapsible=icon]:px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="h-auto px-3 pb-2.5 pt-0 font-mono text-[10px] font-normal tracking-[0.18em] text-[var(--workspace-sidebar-label)] uppercase group-data-[collapsible=icon]:hidden">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
              {navItems.map((item) => {
                const active = item.isActive(pathname);

                return (
                  <SidebarMenuItem
                    key={item.href}
                    className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                  >
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "h-10 rounded-[9px] px-3 text-sm font-medium transition-colors",
                        "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:w-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
                        active
                          ? "bg-[var(--workspace-sidebar-active)] font-semibold text-[var(--workspace-sidebar-active-fg)] shadow-[inset_0_0_0_1px_rgba(91,46,239,0.12)] hover:bg-[var(--workspace-sidebar-active)] hover:text-[var(--workspace-sidebar-active-fg)] data-active:bg-[var(--workspace-sidebar-active)] data-active:text-[var(--workspace-sidebar-active-fg)] [&_svg]:text-[var(--workspace-sidebar-active-fg)]"
                          : "text-[var(--workspace-sidebar-muted)] hover:bg-[var(--workspace-sidebar-hover)] hover:text-[var(--workspace-sidebar-fg)] data-active:bg-[var(--workspace-sidebar-hover)] data-active:text-[var(--workspace-sidebar-fg)] [&_svg]:text-[var(--workspace-sidebar-muted)] hover:[&_svg]:text-[var(--workspace-sidebar-fg)]",
                      )}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="size-[18px] shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto px-3 pb-4 pt-2 group-data-[collapsible=icon]:px-2">
        <Link
          href="/app/account"
          className={cn(
            "flex items-center gap-[11px] overflow-hidden rounded-[10px] px-3 py-[11px] transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent! group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:shadow-none! group-data-[collapsible=icon]:hover:bg-transparent!",
            accountActive
              ? "bg-[rgba(91,46,239,0.20)] shadow-[inset_0_0_0_1px_rgba(91,46,239,0.4)]"
              : "bg-[var(--workspace-sidebar-hover)] hover:bg-[rgba(91,46,239,0.12)]",
          )}
        >
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
            {avatarInitial}
          </span>
          <div className="min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[13px] font-semibold text-[var(--workspace-sidebar-fg)]">
              {displayName}
            </div>
            <div className="truncate font-mono text-[10px] text-[var(--workspace-sidebar-muted)]">
              {accountActive ? "account & settings" : getRoleLabel(user.role)}
            </div>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
