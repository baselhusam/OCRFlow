"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { canvasInspectorSectionLabelClassName } from "@/lib/canvas/canvas-chrome";
import { cn } from "@/lib/utils";

type DetailSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  badge?: string | number;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export function DetailSection({
  title,
  children,
  className,
  badge,
  collapsible = false,
  defaultOpen = true,
}: DetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <section className={cn("px-[18px] py-[22px]", className)}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className={canvasInspectorSectionLabelClassName}>{title}</h3>
          {badge !== undefined && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {children}
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cn("border-b border-border/60", className)}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-[18px] py-3 text-left hover:opacity-80">
          <div className="flex items-center gap-1.5">
            {open ? (
              <ChevronDown className="size-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground" />
            )}
            <h3 className={canvasInspectorSectionLabelClassName}>{title}</h3>
          </div>
          {badge !== undefined && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {badge}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-[18px] pb-4">{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}
