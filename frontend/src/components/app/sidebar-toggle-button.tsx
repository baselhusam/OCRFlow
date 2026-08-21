"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarToggleButtonProps = {
  className?: string;
};

export function SidebarToggleButton({ className }: SidebarToggleButtonProps) {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className={cn(
        "size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-foreground",
        className,
      )}
    >
      {collapsed ? (
        <PanelLeft className="size-4" aria-hidden />
      ) : (
        <PanelLeftClose className="size-4" aria-hidden />
      )}
    </Button>
  );
}
