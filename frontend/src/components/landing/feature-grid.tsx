"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  {
    num: "02",
    title: "Visual canvas, serializable code",
    body: "Pipelines are graphs you can edit on a canvas and version as code — diffable, reusable, and runnable headless.",
  },
  {
    num: "03",
    title: "Swappable stages",
    body: "Layout, OCR, tables, figure description, LLM post-processing — every stage is a node you can replace with your own model.",
  },
  {
    num: "04",
    title: "Self-hostable by design",
    body: "Run locally or in the cloud. On-prem and air-gapped deployments are first-class, not an afterthought.",
  },
  {
    num: "05",
    title: "Templates to start fast",
    body: "Curated best-practice pipelines ship as templates. Start from a proven flow, then customize every connection.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-t border-[var(--landing-hairline)] py-20 md:py-[68px]">
      <div className="mx-auto max-w-6xl px-8">
        <div className="grid divide-y divide-[var(--landing-node-border)] overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] md:grid-cols-2 md:divide-x">
          {features.map((feature, index) => (
            <motion.article
              key={feature.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.55,
                delay: index * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="p-8 transition-colors hover:bg-primary/[0.04] md:p-10"
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                {feature.num}
              </span>
              <h3 className="mt-4 text-[22px] font-bold tracking-[-0.02em] text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-[1.55] text-muted-foreground">
                {feature.body}
              </p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col items-start gap-6 rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] p-8 md:flex-row md:items-center md:justify-between md:p-10"
        >
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
              Ready to build
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              Open the canvas and compose your first pipeline.
            </p>
          </div>
          <Link
            href="/login?next=/app"
            className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-6 font-mono text-xs tracking-[0.25em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
          >
            Enter OCRFlow
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
