"use client";

import { Plus } from "lucide-react";

import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { cn } from "@/lib/utils";

/** Dashed "add" tile that sits at the end of a project grid. */
export function NewProjectCard({ className }: { className?: string }) {
  return (
    <CreateProjectDialog
      trigger={
        <button
          type="button"
          className={cn(
            "group/new flex min-h-[140px] w-full sm:min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--landing-ghost-border)] bg-transparent p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
            className,
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover/new:scale-105">
            <Plus className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-foreground">
              New project
            </span>
            <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
              Opens straight into an empty canvas
            </span>
          </span>
        </button>
      }
    />
  );
}
