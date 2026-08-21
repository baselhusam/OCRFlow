"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { SegmentMark } from "@/components/brand/segment-mark";
import { HeroPipelinePreview } from "@/components/landing/hero-pipeline-preview";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h11l5 5v11H4z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h8M8 16.5h5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function LandingHero() {
  return (
    <section className="flex flex-col items-center justify-center px-8 pb-14 pt-10 text-center">
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mb-8 flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-muted-foreground"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        OPEN&nbsp;SOURCE&nbsp;·&nbsp;SELF&nbsp;HOSTED
      </motion.div>

      <motion.div
        custom={0.1}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <SegmentMark className="h-[108px] w-[108px] text-foreground" />
      </motion.div>

      <motion.h1
        custom={0.2}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-[30px] text-[64px] font-extrabold leading-none tracking-[-0.04em] text-foreground"
      >
        OCRFlow
      </motion.h1>

      <motion.p
        custom={0.3}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-[22px] max-w-[540px] text-[21px] font-medium leading-[1.45] text-[var(--subtle-foreground)]"
      >
        Composable OCR pipelines, fully under your control. Wire stages on a
        canvas, run the whole flow with one click.
      </motion.p>

      <motion.div
        custom={0.4}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full"
      >
        <HeroPipelinePreview />
      </motion.div>

      <motion.div
        custom={0.5}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-12 flex flex-wrap items-center justify-center gap-[14px]"
      >
        <Link
          href="/login?next=/app"
          className="inline-flex items-center gap-[9px] rounded-lg bg-primary px-6 py-[13px] text-[15px] font-semibold text-primary-foreground no-underline shadow-[0_8px_24px_-10px_var(--accent)] transition-opacity hover:opacity-90"
        >
          <PlusIcon />
          Create a pipeline
        </Link>
        <a
          href="#features"
          className="inline-flex items-center gap-[9px] rounded-lg border border-[var(--landing-ghost-border)] bg-[var(--landing-ghost-bg)] px-[22px] py-[13px] text-[15px] font-semibold text-foreground no-underline transition-colors hover:border-primary/40"
        >
          <TemplateIcon />
          Browse templates
        </a>
        <Link
          href="/documentation"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-[13px] text-[15px] font-semibold text-[var(--subtle-foreground)] no-underline transition-colors hover:text-foreground"
        >
          Documentation
          <ArrowIcon />
        </Link>
      </motion.div>
    </section>
  );
}
