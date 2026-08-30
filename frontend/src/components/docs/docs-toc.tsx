"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { DocsHeading } from "@/lib/docs/types";
import { cn } from "@/lib/utils";

type DocsTocProps = {
  headings: DocsHeading[];
};

export function DocsToc({ headings }: DocsTocProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    let frameId: number | null = null;
    const markerOffset = 132;

    const updateActiveHeading = () => {
      frameId = null;
      let nextActiveId = headings[0].id;

      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= markerOffset) {
          nextActiveId = heading.id;
        } else {
          break;
        }
      }

      setActiveId((current) =>
        current === nextActiveId ? current : nextActiveId,
      );
    };

    const onScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateActiveHeading);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="On this page" className="sticky top-24">
      <p className="mb-3 font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        On this page
      </p>
      <ol className="relative space-y-0.5 border-l border-border">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={`${heading.depth}-${heading.id}`}>
              <Link
                href={`#${heading.id}`}
                onClick={() => setActiveId(heading.id)}
                className={cn(
                  "relative block py-1 text-[13px] leading-snug transition-colors",
                  heading.depth === 3 ? "pl-6" : "pl-3.5",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 left-[-3.5px] size-1.5 -translate-y-1/2 rounded-full",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                />
                {heading.title}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
