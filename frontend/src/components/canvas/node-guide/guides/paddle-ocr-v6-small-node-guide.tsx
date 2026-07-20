"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ScanText } from "lucide-react";
import { useEffect, useState } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import {
  layoutGuideStep,
  ProviderBrandedNodeCard,
} from "@/components/canvas/node-guide/guides/layout-guide-shared";
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
const PADDLE_PROVIDER = "paddle";

type OcrLinePreview = { id: string; text: string; top: string; width: string };

const SAMPLE_LINES: OcrLinePreview[] = [
  { id: "l1", text: "Invoice No. 4821", top: "16%", width: "46%" },
  { id: "l2", text: "Composable OCR pipelines", top: "34%", width: "60%" },
  { id: "l3", text: "Total: $1,204.00", top: "52%", width: "40%" },
];

function OcrPageWithLines({
  accentColor,
  reveal,
}: {
  accentColor: string;
  reveal: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative overflow-hidden rounded-md border border-border bg-card shadow-sm"
      style={{ width: 128, height: 160 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/35 to-secondary/10" />
      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded bg-card/90 px-1 py-0.5 shadow-sm">
        <ProviderLogo provider={PADDLE_PROVIDER} size={12} />
        <span className="font-mono text-[7px] tracking-wide text-muted-foreground uppercase">
          det + rec
        </span>
      </div>
      {SAMPLE_LINES.map((line, index) => (
        <motion.div
          key={line.id}
          className="absolute left-[10%]"
          style={{ top: line.top, width: line.width }}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: reveal ? 1 : 0 }}
          transition={{
            delay: reduceMotion ? 0 : 0.2 + index * 0.18,
            duration: 0.35,
            ease: STEP_EASE,
          }}
        >
          <div
            className="h-[10px] rounded-[2px] border"
            style={{
              borderColor: `color-mix(in srgb, ${accentColor} 55%, var(--border))`,
              backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            }}
          />
          {reveal && (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.35 + index * 0.18,
                duration: 0.3,
                ease: STEP_EASE,
              }}
              className="mt-1 truncate font-mono text-[7px] text-foreground/85"
            >
              {line.text}
            </motion.p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function PipelineRoleScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <MiniNodeCard
            title="Select Page"
            output="PageArtifact"
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={PADDLE_PROVIDER}
            output="detect + recognize"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title="Assembler"
            output="DocumentArtifact"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <p className="max-w-[280px] text-center font-mono text-[10px] text-muted-foreground">
          PP-OCR mobile · text detection + recognition in one pass
        </p>
      </div>
    </StepScene>
  );
}

function PageInputScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [connected, setConnected] = useState(false);
  const isConnected = reduceMotion || connected;

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setConnected(true), 600);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <MiniNodeCard
            title="Select Page"
            output="→ PageArtifact"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={isConnected && !reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={PADDLE_PROVIDER}
            output="page image in"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
        </div>
        <GuideWireBadge label="PageArtifact" accentColor={ctx.categoryColor} />
        <p className="max-w-[260px] text-center font-mono text-[10px] text-muted-foreground">
          Full page → detection. Wire a layout node upstream to OCR only its regions.
        </p>
      </div>
    </StepScene>
  );
}

function ParametersScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [highlight, setHighlight] = useState(false);
  const show = reduceMotion || highlight;

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setHighlight(true), 400);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[280px] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-2">
          <ProviderLogo provider={PADDLE_PROVIDER} size={20} />
          <span className="text-xs font-medium text-foreground">OCR options</span>
        </div>
        <GuideParamField
          label="Confidence"
          value={0.5}
          hint="0 – 1 · filter low-score lines"
          accentColor={ctx.categoryColor}
          highlighted={show}
        />
        <p className="font-mono text-[9px] text-muted-foreground">
          Language &amp; angle-classifier are set when the model loads.
        </p>
      </div>
    </StepScene>
  );
}

function ProcessingScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 82 : 24);
  const [revealed, setRevealed] = useState(reduceMotion ?? false);

  useEffect(() => {
    if (reduceMotion) return;
    const revealTimer = window.setTimeout(() => setRevealed(true), 700);
    const interval = window.setInterval(() => {
      setProgress((value) => (value >= 96 ? 24 : value + 10));
    }, 400);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearInterval(interval);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <OcrPageWithLines accentColor={ctx.categoryColor} reveal={revealed} />
        <ProviderBrandedNodeCard
          title={ctx.data.label}
          provider={PADDLE_PROVIDER}
          output="recognizing text…"
          active
          progress={progress}
          accentColor={ctx.categoryColor}
        />
      </div>
    </StepScene>
  );
}

function OutputScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={PADDLE_PROVIDER}
            output="→ TextLine[]"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title="Assembler"
            output="merge pages"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <div className="w-full max-w-[260px] space-y-1.5 rounded-lg border border-border bg-card/80 p-2.5">
          <p className="font-mono text-[8px] tracking-[0.12em] text-muted-foreground uppercase">
            TextLine output
          </p>
          {[
            { id: "l1", text: '"Invoice No. 4821"', conf: "0.98" },
            { id: "l2", text: '"Composable OCR pipelines"', conf: "0.95" },
            { id: "l3", text: '"Total: $1,204.00"', conf: "0.93" },
          ].map((line, index) => (
            <motion.div
              key={line.id}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.1,
                duration: 0.3,
                ease: STEP_EASE,
              }}
              className="flex items-center justify-between gap-2 rounded border border-border/70 bg-secondary/20 px-2 py-1"
            >
              <span className="truncate font-mono text-[9px] text-foreground">
                {line.text}
              </span>
              <span
                className="shrink-0 font-mono text-[8px]"
                style={{ color: ctx.categoryColor }}
              >
                {line.conf}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <ScanText className="size-3.5 shrink-0" aria-hidden />
          Each line: id, bbox, polygon, text, confidence
        </div>
      </div>
    </StepScene>
  );
}

export const PADDLE_OCR_V6_SMALL_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "paddle/ocr-v6-small",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Text recognition",
      "PaddleOCR's small/mobile pipeline detects and recognizes text in a single pass. Lightweight and Apache-2.0 — a fast default for full-page OCR.",
      (ctx) => <PipelineRoleScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "page-input",
      "Page input",
      "Connect a PageArtifact from a loader or Select Page. With no upstream regions it runs full-page detection + recognition; with a layout node upstream it recognizes text inside each region.",
      (ctx) => <PageInputScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "parameters",
      "OCR options",
      "Confidence filters out low-scoring recognized lines. The recognition language and angle classifier are fixed when the model loads.",
      (ctx) => <ParametersScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "processing",
      "Detect + recognize",
      "PP-OCR locates text lines and reads them, returning bounding boxes, polygons, and recognized strings with confidence scores.",
      (ctx) => <ProcessingScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "output",
      "TextLine output",
      "Outputs TextLine[] — recognized text with boxes, polygons, and confidence. Wire to assemblers, exporters, or downstream text processing.",
      (ctx) => <OutputScene ctx={ctx} />,
    ),
  ],
};
