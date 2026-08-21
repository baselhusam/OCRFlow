"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { DocsNavList } from "@/components/docs/docs-nav-list";
import { DocsSearch, DocsSearchTrigger } from "@/components/docs/docs-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DOCS_BASE_PATH, DOCS_GITHUB_URL } from "@/lib/docs/nav";
import type { DocsSearchEntry } from "@/lib/docs/types";

function slugFromPathname(pathname: string): string {
  if (pathname === DOCS_BASE_PATH) return "";
  if (pathname.startsWith(`${DOCS_BASE_PATH}/`)) {
    return pathname.slice(DOCS_BASE_PATH.length + 1);
  }
  return "";
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.4 6.8 9.8.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.5-1.4.1-2.8 0 0 .8-.3 2.8 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .6 1.4.2 2.5.1 2.8.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.4 6.8-5.3 6.8-9.8C22 6.6 17.5 2 12 2z" />
    </svg>
  );
}

type DocsHeaderProps = {
  searchIndex: DocsSearchEntry[];
};

export function DocsHeader({ searchIndex }: DocsHeaderProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-[57px] max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Open documentation menu"
            onClick={() => setNavOpen(true)}
          >
            <Menu />
          </Button>

          <Link
            href="/"
            aria-label="OCRFlow home"
            className="flex items-center gap-[10px] transition-opacity hover:opacity-80"
          >
            <SegmentMark className="h-[22px] w-[22px] text-foreground" />
            <span className="text-[16px] font-extrabold tracking-[-0.03em] text-foreground">
              OCRFlow
            </span>
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <Link
            href={DOCS_BASE_PATH}
            className="hidden font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground sm:inline"
          >
            Docs
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <DocsSearchTrigger onOpen={() => setSearchOpen(true)} />
            <a
              href={DOCS_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-[7px] px-2 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <GitHubIcon />
              GitHub
            </a>
            <ThemeToggle />
            <Link
              href="/login?next=/app"
              className="hidden h-8 items-center rounded-[7px] bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <DocsSearch
        entries={searchIndex}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[min(20rem,88vw)] p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="font-mono text-[11px] tracking-[0.16em] uppercase">
              Documentation
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-3 pt-4">
            <DocsNavList
              currentSlug={slugFromPathname(pathname)}
              onNavigate={() => setNavOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
