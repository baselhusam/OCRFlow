"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchDocs } from "@/lib/docs/search";
import type { DocsSearchEntry } from "@/lib/docs/types";
import { cn } from "@/lib/utils";

type DocsSearchProps = {
  entries: DocsSearchEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DocsSearch({ entries, open, onOpenChange }: DocsSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const hits = useMemo(() => searchDocs(query, entries), [query, entries]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuery("");
      setActive(0);
    }
    onOpenChange(next);
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, Math.max(hits.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter" && hits[active]) {
      event.preventDefault();
      go(hits[active].href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search documentation</DialogTitle>
          <DialogDescription>Find a topic, heading, or command.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search docs…"
            className="h-12 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search documentation"
          />
          <kbd className="hidden rounded-[5px] border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>
        <div className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Type at least two characters. Try “jobs”, “GPU”, or “layout”.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No matches for “{query.trim()}”.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {hits.map((hit, index) => (
                <li key={hit.href}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(hit.href)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[9px] px-2.5 py-2.5 text-left transition-colors",
                      index === active
                        ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-foreground">
                        {hit.title}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                        {hit.section}
                        {hit.matchIn === "heading" && hit.headings[0]
                          ? ` · ${hit.headings[0]}`
                          : ` · ${hit.description}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type DocsSearchTriggerProps = {
  onOpen: () => void;
  className?: string;
};

export function DocsSearchTrigger({ onOpen, className }: DocsSearchTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-[7px] border border-border bg-background px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline">Search docs…</span>
      <kbd className="ml-4 hidden rounded-[4px] border border-border px-1.5 py-px font-mono text-[10px] tracking-wide lg:inline">
        ⌘K
      </kbd>
    </button>
  );
}
