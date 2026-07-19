"use client";

import { motion } from "framer-motion";

const stages = [
  { id: "01", label: "Layout", desc: "Detect regions, blocks, and reading order" },
  { id: "02", label: "Recognise", desc: "OCR from lightweight to heavy models" },
  { id: "03", label: "Tables", desc: "Structure extraction for tabular data" },
  { id: "04", label: "Figures", desc: "CLIP, VLMs, and image description" },
  { id: "05", label: "Export", desc: "Structured JSON, Markdown, or custom schemas" },
];

export function PipelinePreview() {
  return (
    <section id="features" className="border-t border-[var(--landing-hairline)] py-20 md:py-[68px]">
      <div className="mx-auto max-w-6xl px-8">
        <div className="mb-10 max-w-xl">
          <p className="mb-3.5 font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            01 — Pipeline
          </p>
          <h2 className="text-[32px] font-bold tracking-[-0.025em] text-foreground">
            ComfyUI for documents
          </h2>
          <p className="mt-3.5 text-base leading-[1.55] text-muted-foreground">
            Each node is a model or transform. Wire them together, swap any
            stage, and run the same pipeline headless via SDK or API.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] shadow-[0_1px_2px_rgba(20,18,37,0.08)]">
          <div className="flex items-center justify-between border-b border-[var(--landing-node-border)] px-5 py-3">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              pipeline.canvas
            </span>
            <span className="font-mono text-[11px] text-primary">v0.1</span>
          </div>

          <div className="grid md:grid-cols-5 md:divide-x md:divide-[var(--landing-node-border)]">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative border-b border-[var(--landing-node-border)] p-6 transition-colors last:border-b-0 hover:bg-primary/[0.04] md:border-b-0"
              >
                {index < stages.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-2 z-10 hidden h-px w-4 bg-primary md:block"
                  />
                )}
                <span className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground">
                  {stage.id}
                </span>
                <h3 className="mt-3 font-mono text-sm tracking-wide text-foreground uppercase">
                  {stage.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {stage.desc}
                </p>
                <div className="mt-4 h-1 w-8 bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
