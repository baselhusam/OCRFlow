"use client";

import Link from "next/link";
import { BookOpen, Boxes, ChevronDown, Cpu, Rocket, Terminal } from "lucide-react";
import { useState } from "react";

import { DOCS_NAV, docsHref } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

type DocsNavListProps = {
  currentSlug: string;
  onNavigate?: () => void;
};

const SECTION_ICONS = {
  "Get started": Rocket,
  Concepts: Boxes,
  Models: Cpu,
  Guides: BookOpen,
  Reference: Terminal,
} as const;

export function DocsNavList({ currentSlug, onNavigate }: DocsNavListProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(DOCS_NAV.map((section) => section.title)),
  );

  function toggleSection(title: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }

  return (
    <nav aria-label="Documentation" className="space-y-1.5 pb-10">
      {DOCS_NAV.map((section) => {
        const containsActivePage = section.items.some(
          (item) => item.slug === currentSlug,
        );
        const isOpen = openSections.has(section.title) || containsActivePage;
        const SectionIcon = SECTION_ICONS[section.title as keyof typeof SECTION_ICONS];
        const sectionId = `docs-nav-${section.title.toLowerCase().replaceAll(" ", "-")}`;

        return (
          <div key={section.title} className="pb-2">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={sectionId}
              onClick={() => toggleSection(section.title)}
              className="group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/70"
            >
              <span className="flex size-5 items-center justify-center rounded-[5px] bg-muted text-muted-foreground transition-colors group-hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] group-hover:text-primary">
                <SectionIcon className="size-3.5" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase group-hover:text-foreground">
                {section.title}
              </span>
              <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground/70">
                {section.items.length}
              </span>
              <ChevronDown
                className={cn(
                  "size-3 text-muted-foreground transition-transform duration-200",
                  !isOpen && "-rotate-90",
                )}
                aria-hidden
              />
            </button>
            <div
              id={sectionId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <ul className="min-h-0 space-y-0.5 overflow-hidden pt-1">
                {section.items.map((item) => {
                  const href = docsHref(item.slug);
                  const active = item.slug === currentSlug;

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center rounded-md px-3 py-2 text-[13.5px] leading-5 transition-[background-color,color,box-shadow] duration-150",
                          active
                            ? "bg-[color-mix(in_srgb,var(--primary)_9%,transparent)] font-semibold text-[var(--workspace-sidebar-active-fg)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_14%,transparent)] before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary"
                            : "text-[var(--subtle-foreground)] hover:bg-[var(--workspace-sidebar-hover)] hover:text-foreground",
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
