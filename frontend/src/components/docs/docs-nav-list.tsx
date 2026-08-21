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
                      "flex items-center rounded-[7px] px-2.5 py-[7px] text-[13.5px] transition-colors",
                      active
                        ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-semibold text-primary shadow-[inset_3px_0_0_var(--primary)]"
                        : "text-[var(--subtle-foreground)] hover:bg-muted/70 hover:text-foreground",
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
