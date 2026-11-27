"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Cable,
  FileStack,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  LayoutTemplate,
  Plus,
  Shield,
  type LucideIcon,
} from "lucide-react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { useEngineStatus } from "@/hooks/use-engine-status";
import type { User } from "@/lib/api/client";
import { canAccessAdminPanel, canWrite } from "@/lib/auth/roles";
import { isEditableKeyboardTarget } from "@/lib/keyboard-shortcuts";
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
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  shortcut?: string;
};

const workspaceNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/app",
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === "/app",
  },
  {
    title: "Projects",
    href: "/app/projects",
    icon: FolderKanban,
    isActive: (pathname) => pathname.startsWith("/app/projects"),
  },
  {
    title: "Pipelines",
    href: "/app/pipelines",
    icon: GitBranch,
    isActive: (pathname) => pathname.startsWith("/app/pipelines"),
  },
  {
    title: "Jobs",
    href: "/app/jobs",
    icon: FileStack,
    isActive: (pathname) => pathname.startsWith("/app/jobs"),
  },
  {
    title: "Analytics",
    href: "/app/analytics",
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith("/app/analytics"),
  },
];

const adminNav: NavItem[] = [
  {
    title: "Configuration",
    href: "/app/configuration",
    icon: Cable,
    isActive: (pathname) => pathname.startsWith("/app/configuration"),
  },
  {
    title: "Admin panel",
    href: "/app/admin?tab=users",
    icon: Shield,
    isActive: (pathname) => pathname.startsWith("/app/admin"),
  },
];

const resourceNav: NavItem[] = [
  {
    title: "Templates",
    href: "/templates",
    icon: LayoutTemplate,
    isActive: () => false,
  },
  {
    title: "Documentation",
    href: "/documentation",
    icon: BookOpen,
    isActive: () => false,
  },
];

const itemBase =
  "relative h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors group-data-[collapsible=icon]:justify-center [&_svg]:size-[17px]";
const itemIdle =
  "text-[var(--workspace-sidebar-muted)] hover:bg-[var(--workspace-sidebar-hover)] hover:text-[var(--workspace-sidebar-fg)] data-active:bg-transparent [&_svg]:text-[var(--workspace-sidebar-muted)] hover:[&_svg]:text-[var(--workspace-sidebar-fg)]";
const itemActive =
  "bg-[var(--workspace-sidebar-active)] font-semibold text-[var(--workspace-sidebar-active-fg)] hover:bg-[var(--workspace-sidebar-active)] hover:text-[var(--workspace-sidebar-active-fg)] data-active:bg-[var(--workspace-sidebar-active)] data-active:text-[var(--workspace-sidebar-active-fg)] [&_svg]:text-[var(--workspace-sidebar-active-fg)] before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary group-data-[collapsible=icon]:before:hidden";

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarMenu className="gap-0.5">
      {items.map((item) => {
        const active = item.isActive(pathname);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={item.title}
              className={cn(itemBase, active ? itemActive : itemIdle)}
              render={
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                />
              }
            >
              <item.icon aria-hidden />
              <span className="group-data-[collapsible=icon]:hidden">
                {item.title}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function EngineStatusItem({
  href,
  onNavigate,
}: {
  href: string;
  onNavigate: () => void;
}) {
  const { status, onlineCount, engines } = useEngineStatus();
  const tone =
    status === "loading"
      ? "bg-muted-foreground/40"
      : onlineCount === 0
        ? "bg-destructive"
        : onlineCount < engines.length
          ? "bg-[var(--status-warn)]"
          : "bg-[var(--status-ok)]";
  const label =
    status === "loading"
      ? "Checking engines…"
      : status === "error"
        ? "Engine status unavailable"
        : `${onlineCount} of ${engines.length} engines online`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        className={cn(itemBase, itemIdle, "h-8 text-[12.5px]")}
        render={<Link href={href} onClick={onNavigate} />}
      >
        <span className="flex size-[17px] items-center justify-center" aria-hidden>
          <span className={cn("size-2 rounded-full", tone, status === "loading" && "animate-pulse")} />
        </span>
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {label}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

type AppSidebarProps = {
  user: User;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isAdmin = canAccessAdminPanel(user);
  const writable = canWrite(user);
  const [createOpen, setCreateOpen] = useState(false);
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  // "N" opens the new-project dialog from anywhere in the workspace.
  useEffect(() => {
    if (!writable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "n" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !isEditableKeyboardTarget(event.target) &&
        !document.querySelector("[role='dialog'], [role='alertdialog'], [role='menu']")
      ) {
        event.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [writable]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-none [&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:border-[var(--workspace-sidebar-border)] [&_[data-slot=sidebar-inner]]:bg-[var(--workspace-sidebar-bg)] [&_[data-slot=sidebar-inner]]:text-[var(--workspace-sidebar-fg)]"
    >
      <SidebarHeader className="h-14 shrink-0 flex-row items-center px-4 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          href="/app"
          aria-label="OCRFlow home"
          onClick={closeOnMobile}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <SegmentMark className="size-[22px] shrink-0 text-[var(--workspace-sidebar-fg)]" />
          <span className="truncate text-[17px] font-extrabold tracking-[-0.03em] text-[var(--workspace-sidebar-fg)] group-data-[collapsible=icon]:hidden">
            OCRFlow
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2.5 pt-1 group-data-[collapsible=icon]:px-2">
        {writable ? (
          <div className="px-0 pt-1 pb-3">
            <CreateProjectDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              trigger={
                <button
                  type="button"
                  aria-label="New project"
                  className="flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--workspace-sidebar-border)] bg-[var(--workspace-sidebar-hover)] px-2.5 text-[13px] font-semibold text-[var(--workspace-sidebar-fg)] transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&_svg]:text-primary dark:[&_svg]:text-[var(--primary-text)]"
                >
                  <Plus className="size-4" aria-hidden />
                  <span className="group-data-[collapsible=icon]:hidden">
                    New project
                  </span>
                  <kbd className="ml-auto font-mono text-[10px] font-normal text-[var(--workspace-sidebar-label)] group-data-[collapsible=icon]:hidden">
                    N
                  </kbd>
                </button>
              }
            />
          </div>
        ) : null}

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <NavList
              items={workspaceNav}
              pathname={pathname}
              onNavigate={closeOnMobile}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin ? (
          <SidebarGroup className="mt-5 p-0">
            <SidebarGroupLabel className="h-6 px-2.5 font-mono text-[10px] font-normal tracking-[0.18em] text-[var(--workspace-sidebar-label)] uppercase">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavList
                items={adminNav}
                pathname={pathname}
                onNavigate={closeOnMobile}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="mt-auto gap-0 border-t border-[var(--workspace-sidebar-border)] px-2.5 py-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="gap-0.5">
          <EngineStatusItem
            href={isAdmin ? "/app/configuration" : "/documentation/models"}
            onNavigate={closeOnMobile}
          />
        </SidebarMenu>
        <NavList
          items={resourceNav}
          pathname={pathname}
          onNavigate={closeOnMobile}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
