import Link from "next/link";

import { DOCS_NAV, docsHref } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

type DocsNavListProps = {
  currentSlug: string;
  onNavigate?: () => void;
};

export function DocsNavList({ currentSlug, onNavigate }: DocsNavListProps) {
  return (
    <nav aria-label="Documentation" className="space-y-7 pb-10">
      {DOCS_NAV.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-2.5 font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            {section.title}
          </p>
          <ul className="space-y-0.5">
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
      ))}
    </nav>
  );
}
