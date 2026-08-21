"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { SegmentMark } from "@/components/brand/segment-mark";
import { ThemeToggle } from "@/components/theme-toggle";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-full flex-col bg-background text-foreground">
      <div className="ocrflow-landing-backdrop ocrflow-landing-backdrop-dots" />
      <div className="ocrflow-landing-backdrop ocrflow-landing-backdrop-glow" />

      <header className="relative z-[2] flex items-center justify-between px-8 py-[22px]">
        <Link
          href="/"
          aria-label="OCRFlow home"
          className="flex items-center gap-[11px] transition-opacity hover:opacity-80"
        >
          <SegmentMark className="h-[26px] w-[26px] text-foreground" />
          <span className="text-lg font-extrabold tracking-[-0.03em] text-foreground">
            OCRFlow
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-[1] flex flex-1 items-center justify-center px-8 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <SegmentMark className="h-16 w-16 text-foreground" />
            <p className="mt-5 flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              AUTHENTICATION
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] shadow-[0_1px_2px_rgba(20,18,37,0.08),0_18px_40px_-22px_rgba(20,18,37,0.25)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_40px_-22px_rgba(0,0,0,0.35)]">
            <div className="border-b border-[var(--landing-node-border)] px-6 py-5">
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-[1.55] text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="px-6 py-6">{children}</div>

            {footer ? (
              <div className="border-t border-[var(--landing-node-border)] px-6 py-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
