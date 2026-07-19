"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import {
  FlowConnector,
  GuideParamField,
  GuideWireBadge,
  MiniNodeCard,
  StepScene,
} from "@/components/canvas/node-guide/node-guide-primitives";
import type {
  NodeGuideContext,
  NodeGuideDefinition,
} from "@/lib/canvas/node-guide-types";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;

function PipelineEntryScene({ ctx }: { ctx: NodeGuideContext }) {
  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-3">
        <MiniNodeCard
          title={ctx.data.label}
          output="source node"
          active
          accentColor={ctx.categoryColor}
          source
        />
        <GuideWireBadge label={ctx.data.categoryLabel} accentColor={ctx.categoryColor} />
        <p className="max-w-[240px] text-center font-mono text-[10px] text-muted-foreground">
          No input wire — drag from the palette to start a pipeline
        </p>
      </div>
    </StepScene>
  );
}

function DocumentInputScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [dropped, setDropped] = useState(false);
  const isDropped = reduceMotion || dropped;

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setDropped(true), 700);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[280px] flex-col items-center gap-4">
        <motion.div
          initial={reduceMotion ? false : { y: -48, opacity: 0 }}
          animate={{ y: isDropped ? 0 : -48, opacity: isDropped ? 1 : 0 }}
          transition={{ duration: 0.55, ease: STEP_EASE }}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm"
        >
          <FileText className="size-4 text-destructive/80" aria-hidden />
          <span className="text-xs font-medium text-foreground">report.pdf</span>
        </motion.div>
        <div
          className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6"
          style={{
            borderColor: isDropped
              ? `color-mix(in srgb, ${ctx.categoryColor} 50%, var(--border))`
              : undefined,
            backgroundColor: isDropped
              ? `color-mix(in srgb, ${ctx.categoryColor} 8%, var(--card))`
              : undefined,
          }}
        >
          <Upload
            className="size-5 text-muted-foreground"
            style={{ color: isDropped ? ctx.categoryColor : undefined }}
            aria-hidden
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {isDropped ? "Document ready" : "Drop PDF here"}
          </p>
        </div>
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Input: DocumentInput · no upstream connection
        </p>
      </div>
    </StepScene>
  );
}

function ParametersScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [highlightDpi, setHighlightDpi] = useState(false);
  const [highlightPages, setHighlightPages] = useState(false);
  const showDpi = reduceMotion || highlightDpi;
  const showPages = reduceMotion || highlightPages;

  useEffect(() => {
    if (reduceMotion) return;
    const dpiTimer = window.setTimeout(() => setHighlightDpi(true), 400);
    const pagesTimer = window.setTimeout(() => setHighlightPages(true), 900);
    return () => {
      window.clearTimeout(dpiTimer);
      window.clearTimeout(pagesTimer);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="grid w-full max-w-[280px] gap-3">
        <GuideParamField
          label="DPI"
          value={200}
          hint="72 – 600 · raster resolution"
          accentColor={ctx.categoryColor}
          highlighted={showDpi}
        />
        <GuideParamField
          label="Max pages"
          value={50}
          hint="1 – 500 · cap per run"
          accentColor={ctx.categoryColor}
          highlighted={showPages}
        />
      </div>
    </StepScene>
  );
}

function ProcessingScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 72 : 18);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? 18 : value + 14));
    }, 450);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-1.5">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.15,
                duration: 0.4,
                ease: STEP_EASE,
              }}
              className="rounded-sm border border-border bg-card shadow-sm"
              style={{
                width: 36,
                height: 48 + index * 6,
                borderColor: `color-mix(in srgb, ${ctx.categoryColor} 35%, var(--border))`,
              }}
            />
          ))}
        </div>
        <MiniNodeCard
          title={ctx.data.label}
          output="rasterizing…"
          active
          progress={progress}
          accentColor={ctx.categoryColor}
          source
        />
        <p className="font-mono text-[10px] text-muted-foreground">
          Each PDF page → image at configured DPI
        </p>
      </div>
    </StepScene>
  );
}

function OutputScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <MiniNodeCard
            title={ctx.data.label}
            output="→ PageArtifact[]"
            active
            accentColor={ctx.categoryColor}
            source
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title="Next stage"
            output="PageArtifact"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["page_0", "page_1", "page_2"].map((page, index) => (
            <motion.span
              key={page}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.12,
                duration: 0.35,
                ease: STEP_EASE,
              }}
            >
              <GuideWireBadge label={page} accentColor={ctx.categoryColor} />
            </motion.span>
          ))}
        </div>
      </div>
    </StepScene>
  );
}

export const PDF_LOADER_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "loader/pdf",
  steps: [
    {
      id: "pipeline-entry",
      title: "Pipeline entry",
      description:
        "PDF Loader is a source node — the first step in your pipeline. It has no input wire; you upload a document directly.",
      render: (ctx) => <PipelineEntryScene ctx={ctx} />,
    },
    {
      id: "document-input",
      title: "Document input",
      description:
        "Upload a PDF file in Setup or on the canvas node. The loader reads the file from your project assets — no upstream node required.",
      render: (ctx) => <DocumentInputScene ctx={ctx} />,
    },
    {
      id: "parameters",
      title: "Parameters",
      description:
        "DPI controls raster resolution (higher = sharper, slower). Max pages limits how many pages are processed per run.",
      render: (ctx) => <ParametersScene ctx={ctx} />,
    },
    {
      id: "processing",
      title: "Processing",
      description:
        "On run, each PDF page is rasterized to an image at your chosen DPI. Progress appears on the node while loading.",
      render: (ctx) => <ProcessingScene ctx={ctx} />,
    },
    {
      id: "output",
      title: "Output",
      description:
        "The node outputs PageArtifact[] — one artifact per page. Wire this to layout detection, OCR, or any node that accepts page input.",
      render: (ctx) => <OutputScene ctx={ctx} />,
    },
  ],
};
