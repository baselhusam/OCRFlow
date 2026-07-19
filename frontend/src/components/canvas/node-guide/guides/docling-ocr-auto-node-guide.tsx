"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ScanText, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const DOCLING_PROVIDER = "docling";

const OCR_ENGINES = ["Tesseract", "EasyOCR", "RapidOCR", "Surya OCR"] as const;

type OcrLinePreview = {
  id: string;
  text: string;
  top: string;
  width: string;
};

const SAMPLE_LINES: OcrLinePreview[] = [
  { id: "l1", text: "Introduction", top: "14%", width: "42%" },
  { id: "l2", text: "Composable OCR pipelines", top: "28%", width: "58%" },
  { id: "l3", text: "under your control.", top: "40%", width: "48%" },
];

function OcrPageWithLines({
  accentColor,
  lines,
  reveal,
}: {
  accentColor: string;
  lines: OcrLinePreview[];
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
        <ProviderLogo provider={DOCLING_PROVIDER} size={12} />
        <span className="font-mono text-[7px] tracking-wide text-muted-foreground uppercase">
          auto
        </span>
      </div>
      {lines.map((line, index) => (
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
            title="PDF Loader"
            output="PageArtifact"
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={DOCLING_PROVIDER}
            output="full-page OCR"
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
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px]"
          style={{
            backgroundColor: `color-mix(in srgb, ${ctx.categoryColor} 12%, var(--card))`,
            color: ctx.categoryColor,
          }}
        >
          <Sparkles className="size-3 shrink-0" aria-hidden />
          OcrAutoModel · picks the best installed engine
        </div>
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
            provider={DOCLING_PROVIDER}
            output="page image in"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
        </div>
        <GuideWireBadge label="PageArtifact" accentColor={ctx.categoryColor} />
        <p className="max-w-[260px] text-center font-mono text-[10px] text-muted-foreground">
          Input: rasterized page · from PDF Loader, Image Loader, or Select Page
        </p>
      </div>
    </StepScene>
  );
}

function ParametersScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [highlightLang, setHighlightLang] = useState(false);
  const [highlightConf, setHighlightConf] = useState(false);
  const showLang = reduceMotion || highlightLang;
  const showConf = reduceMotion || highlightConf;

  useEffect(() => {
    if (reduceMotion) return;
    const langTimer = window.setTimeout(() => setHighlightLang(true), 400);
    const confTimer = window.setTimeout(() => setHighlightConf(true), 900);
    return () => {
      window.clearTimeout(langTimer);
      window.clearTimeout(confTimer);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[280px] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-2">
          <ProviderLogo provider={DOCLING_PROVIDER} size={20} />
          <span className="text-xs font-medium text-foreground">OCR options</span>
        </div>
        <GuideParamField
          label="Languages"
          value="eng"
          hint="Comma-separated · ISO codes"
          accentColor={ctx.categoryColor}
          highlighted={showLang}
        />
        <GuideParamField
          label="Confidence"
          value={0.5}
          hint="0 – 1 · filter low-score lines"
          accentColor={ctx.categoryColor}
          highlighted={showConf}
        />
        <p className="font-mono text-[9px] text-muted-foreground">
          force_full_page_ocr · scans the entire page
        </p>
      </div>
    </StepScene>
  );
}

function AutoEngineScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [activeEngine, setActiveEngine] = useState(0);
  const [progress, setProgress] = useState(reduceMotion ? 82 : 24);
  const [linesRevealed, setLinesRevealed] = useState(reduceMotion ?? false);

  useEffect(() => {
    if (reduceMotion) return;
    const engineInterval = window.setInterval(() => {
      setActiveEngine((index) => (index + 1) % OCR_ENGINES.length);
    }, 700);
    const revealTimer = window.setTimeout(() => setLinesRevealed(true), 900);
    const progressInterval = window.setInterval(() => {
      setProgress((value) => (value >= 96 ? 24 : value + 10));
    }, 400);
    return () => {
      window.clearInterval(engineInterval);
      window.clearTimeout(revealTimer);
      window.clearInterval(progressInterval);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <OcrPageWithLines
          accentColor={ctx.categoryColor}
          lines={SAMPLE_LINES}
          reveal={linesRevealed}
        />
        <div className="flex flex-wrap justify-center gap-1.5">
          {OCR_ENGINES.map((engine, index) => (
            <span
              key={engine}
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[8px] transition-colors",
                index === activeEngine
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
              style={
                index === activeEngine
                  ? {
                      backgroundColor: `color-mix(in srgb, ${ctx.categoryColor} 16%, var(--card))`,
                      color: ctx.categoryColor,
                    }
                  : undefined
              }
            >
              {engine}
            </span>
          ))}
        </div>
        <ProviderBrandedNodeCard
          title={ctx.data.label}
          provider={DOCLING_PROVIDER}
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
            provider={DOCLING_PROVIDER}
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
            { id: "l1", text: '"Introduction"', conf: "0.97" },
            { id: "l2", text: '"Composable OCR pipelines"', conf: "0.94" },
            { id: "l3", text: '"under your control."', conf: "0.91" },
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
          Each line: id, bbox, text, confidence, language
        </div>
      </div>
    </StepScene>
  );
}

export const DOCLING_OCR_AUTO_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "docling/ocr-auto",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Full-page OCR",
      "Docling OCR Auto runs optical character recognition across the entire page. It auto-selects the best available Docling OCR engine — no manual engine wiring required.",
      (ctx) => <PipelineRoleScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "page-input",
      "Page input",
      "Connect a PageArtifact from PDF Loader, Image Loader, or Select Page. The node reads the page image and optional upstream regions, then performs full-page OCR.",
      (ctx) => <PageInputScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "parameters",
      "OCR options",
      "Languages sets expected script codes (e.g. eng). Confidence filters out low-scoring recognized lines from the output.",
      (ctx) => <ParametersScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "auto-engine",
      "Auto engine",
      "OcrAutoModel picks the best installed engine at runtime — Tesseract, EasyOCR, RapidOCR, or Surya OCR. Text cells are extracted from the full page scan.",
      (ctx) => <AutoEngineScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "output",
      "TextLine output",
      "Outputs TextLine[] — recognized text with bounding boxes and confidence scores. Wire to assemblers, exporters, or downstream text processing nodes.",
      (ctx) => <OutputScene ctx={ctx} />,
    ),
  ],
};
