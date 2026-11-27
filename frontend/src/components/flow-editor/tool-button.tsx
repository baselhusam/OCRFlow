"use client";

import { forwardRef, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ToolButtonProps = {
  label: string;
  shortcut?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
  tone?: "default" | "danger" | "primary";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  children: ReactNode;
};

/** Square icon button with a tooltip that shows its shortcut. */
export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(
  function ToolButton(
    {
      label,
      shortcut,
      onClick,
      disabled,
      active,
      tone = "default",
      side = "top",
      className,
      children,
    },
    ref,
  ) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={ref}
              type="button"
              aria-label={label}
              aria-pressed={active}
              disabled={disabled}
              onClick={onClick}
              className={cn(
                "nodrag nopan inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors",
                "hover:bg-foreground/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-40",
                active && "bg-primary/12 text-[var(--primary-text,var(--primary))]",
                tone === "danger" && "hover:bg-destructive/12 hover:text-destructive",
                tone === "primary" && "text-[var(--primary-text,var(--primary))]",
                className,
              )}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="gap-2">
          {label}
          {shortcut ? (
            <kbd className="rounded bg-background/15 px-1.5 py-px font-mono text-[10px]">
              {shortcut}
            </kbd>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  },
);
