import Link from "next/link";

import { SegmentMark } from "@/components/brand/segment-mark";
import { ThemeToggle } from "@/components/theme-toggle";

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.4 6.8 9.8.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.5-1.4.1-2.8 0 0 .8-.3 2.8 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .6 1.4.2 2.5.1 2.8.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.4 6.8-5.3 6.8-9.8C22 6.6 17.5 2 12 2z" />
    </svg>
  );
}

export function LandingHeader() {
  return (
    <header className="relative z-[2] flex flex-wrap items-center justify-between gap-4 px-8 py-[22px]">
      <Link
        href="/"
        aria-label="OCRFlow home"
        className="flex items-center gap-[11px] transition-opacity hover:opacity-80"
      >
        <SegmentMark className="h-[26px] w-[26px] text-foreground" />
        <span className="text-lg font-extrabold tracking-[-0.03em] text-foreground">
          OCRFlow
        </span>
        <span className="ml-2 rounded-[5px] border border-[var(--landing-hairline)] px-[9px] py-[3px] font-mono text-[11px] text-muted-foreground">
          v1.0.0
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-[18px]">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--status-ok)] opacity-75 ocrflow-animate-pulse" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-ok)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--status-ok)_18%,transparent)]" />
          </span>
          instance running · localhost:8080
        </span>
        <Link
          href="/documentation"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Docs
        </Link>
        <a
          href="https://github.com/baselhusam/OCRFlow"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-[7px] font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <GitHubIcon />
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
