"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Braces,
  FileText,
  Layers,
  ScanText,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SegmentMark } from "@/components/brand/segment-mark";
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
const DOCLING_PROVIDER = "docling";

const PIPELINE_STAGES = [
  { id: "layout", label: "Layout", icon: Layers },
  { id: "ocr", label: "OCR", icon: ScanText },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "enrich", label: "Enrich", icon: Sparkles },
] as const;

const SAMPLE_MARKDOWN = `# Quarterly Report

Revenue increased across all regions.

| Region | Q1 | Q2 |
|--------|----|----|
| NA     | 12% | 18% |`;

function DocumentBranchMiniPanel({
  accentColor,
  reveal,
}: {
  accentColor: string;
  reveal: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="w-[168px] overflow-hidden rounded-[10px] border bg-card shadow-sm"
      style={{ borderColor: `color-mix(in srgb, ${accentColor} 40%, var(--border))` }}
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <SegmentMark size={14} className="shrink-0 text-foreground" />
        <span className="font-mono text-[8px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Document Branch
        </span>
      </div>
      <div className="flex gap-1 border-b border-border/70 px-2 py-1">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[7px]"
          style={{
            backgroundColor: `color-mix(in srgb, ${accentColor} 14%, var(--card))`,
            color: accentColor,
          }}
        >
          markdown
        </span>
        <span className="rounded px-1.5 py-0.5 font-mono text-[7px] text-muted-foreground">
          json
        </span>
      </div>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: reveal ? 1 : 0 }}
        transition={{ duration: 0.35, ease: STEP_EASE }}
        className="space-y-1 p-2"
      >
        {SAMPLE_MARKDOWN.split("\n").slice(0, 4).map((line, index) => (
          <p
            key={`md-${index}`}
            className="truncate font-mono text-[7px] leading-snug text-foreground/85"
          >
            {line || "\u00a0"}
          </p>
        ))}
      </motion.div>
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
            output="DocumentInput"
            accentColor={ctx.categoryColor}
            source
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={DOCLING_PROVIDER}
            output="full pipeline"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title="Export"
            output="File"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <p className="max-w-[290px] text-center font-mono text-[10px] text-muted-foreground">
          One node · Docling DocumentConverter preset — layout, OCR, tables, and enrichments
        </p>
      </div>
    </StepScene>
  );
}

function DocumentInputScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [dropped, setDropped] = useState(false);
  const [wired, setWired] = useState(false);
  const showUpload = reduceMotion || dropped;
  const showWire = reduceMotion || wired;

  useEffect(() => {
    if (reduceMotion) return;
    const uploadTimer = window.setTimeout(() => setDropped(true), 500);
    const wireTimer = window.setTimeout(() => setWired(true), 1100);
    return () => {
      window.clearTimeout(uploadTimer);
      window.clearTimeout(wireTimer);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[300px] flex-col items-center gap-4">
        <div
          className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5"
          style={{
            borderColor: showUpload
              ? `color-mix(in srgb, ${ctx.categoryColor} 50%, var(--border))`
              : undefined,
            backgroundColor: showUpload
              ? `color-mix(in srgb, ${ctx.categoryColor} 8%, var(--card))`
              : undefined,
          }}
        >
          <Upload
            className="size-5 text-muted-foreground"
            style={{ color: showUpload ? ctx.categoryColor : undefined }}
            aria-hidden
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {showUpload ? "report.pdf ready" : "Upload in Setup"}
          </p>
        </div>
        <p className="font-mono text-[9px] text-muted-foreground">or</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <MiniNodeCard
            title="PDF Loader"
            output="→ file"
            active={showWire}
            accentColor={ctx.categoryColor}
            source
          />
          <FlowConnector animated={showWire && !reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={DOCLING_PROVIDER}
            output="document in"
            active={showWire}
            accentColor={ctx.categoryColor}
          />
        </div>
        <GuideWireBadge label="DocumentInput" accentColor={ctx.categoryColor} />
      </div>
    </StepScene>
  );
}

function ParametersScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setStep((value) => (value >= 4 ? 0 : value + 1));
    }, 700);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  const highlight = (index: number) => reduceMotion || step >= index;

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[290px] flex-col gap-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-2">
          <ProviderLogo provider={DOCLING_PROVIDER} size={20} />
          <span className="text-xs font-medium text-foreground">
            ConvertPipelineOptions
          </span>
        </div>
        <GuideParamField
          label="Layout model"
          value="heron"
          hint="Heron · RT-DETRv2 layout"
          accentColor={ctx.categoryColor}
          highlighted={highlight(0)}
        />
        <GuideParamField
          label="OCR engine"
          value="auto"
          hint="Best available engine"
          accentColor={ctx.categoryColor}
          highlighted={highlight(1)}
        />
        <GuideParamField
          label="TableFormer mode"
          value="accurate"
          hint="accurate or fast"
          accentColor={ctx.categoryColor}
          highlighted={highlight(2)}
        />
        <div className="grid grid-cols-2 gap-2">
          <GuideParamField
            label="Enrich pictures"
            value="true"
            accentColor={ctx.categoryColor}
            highlighted={highlight(3)}
          />
          <GuideParamField
            label="Enrich formulas"
            value="true"
            accentColor={ctx.categoryColor}
            highlighted={highlight(4)}
          />
        </div>
      </div>
    </StepScene>
  );
}

function ProcessingScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);
  const [progress, setProgress] = useState(reduceMotion ? 84 : 16);

  useEffect(() => {
    if (reduceMotion) return;
    const stageInterval = window.setInterval(() => {
      setActiveStage((index) => (index + 1) % PIPELINE_STAGES.length);
    }, 650);
    const progressInterval = window.setInterval(() => {
      setProgress((value) => (value >= 96 ? 16 : value + 9));
    }, 380);
    return () => {
      window.clearInterval(stageInterval);
      window.clearInterval(progressInterval);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-1.5">
          {PIPELINE_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === activeStage;
            return (
              <motion.div
                key={stage.id}
                animate={{ scale: isActive ? 1.04 : 1, opacity: isActive ? 1 : 0.55 }}
                transition={{ duration: 0.3, ease: STEP_EASE }}
                className="flex items-center gap-1 rounded-md border px-2 py-1"
                style={{
                  borderColor: isActive
                    ? ctx.categoryColor
                    : "var(--border)",
                  backgroundColor: isActive
                    ? `color-mix(in srgb, ${ctx.categoryColor} 12%, var(--card))`
                    : undefined,
                }}
              >
                <Icon
                  className="size-3 shrink-0"
                  style={{ color: isActive ? ctx.categoryColor : undefined }}
                  aria-hidden
                />
                <span className="font-mono text-[8px] text-foreground">{stage.label}</span>
              </motion.div>
            );
          })}
        </div>
        <ProviderBrandedNodeCard
          title={ctx.data.label}
          provider={DOCLING_PROVIDER}
          output="converting…"
          active
          progress={progress}
          accentColor={ctx.categoryColor}
        />
        <p className="font-mono text-[10px] text-muted-foreground">
          DocumentConverter · layout → OCR → tables → enrichments
        </p>
      </div>
    </StepScene>
  );
}

function OutputBranchScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(reduceMotion ?? false);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setExpanded(true), 650);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={DOCLING_PROVIDER}
            output="→ DocumentArtifact"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title="Export"
            output="JSON / MD"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <div className="flex flex-wrap items-start justify-center gap-3">
          <DocumentBranchMiniPanel accentColor={ctx.categoryColor} reveal={expanded} />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: expanded ? 1 : 0, y: expanded ? 0 : 6 }}
            transition={{ duration: 0.35, ease: STEP_EASE }}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px]"
            style={{
              borderColor: `color-mix(in srgb, ${ctx.categoryColor} 35%, var(--border))`,
              color: ctx.categoryColor,
              backgroundColor: `color-mix(in srgb, ${ctx.categoryColor} 8%, var(--card))`,
            }}
          >
            <ArrowUpRight className="size-3 shrink-0" aria-hidden />
            Expand to node → Document Branch
          </motion.div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3" aria-hidden />
            markdown
          </span>
          <span className="inline-flex items-center gap-1">
            <Braces className="size-3" aria-hidden />
            json
          </span>
          <GuideWireBadge label="pages[]" accentColor={ctx.categoryColor} />
        </div>
      </div>
    </StepScene>
  );
}

export const DOCLING_CONVERT_PIPELINE_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "docling/convert-pipeline",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "All-in-one conversion",
      "Docling Document Converter runs the full DocumentConverter pipeline in a single node — layout detection, OCR, table structure, and optional picture and formula enrichment.",
      (ctx) => <PipelineRoleScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "document-input",
      "Document input",
      "Upload a PDF in Setup or wire PDF Loader / Image Loader. The node accepts DocumentInput — a project asset or file from an upstream loader.",
      (ctx) => <DocumentInputScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "parameters",
      "Pipeline options",
      "Configure layout model, OCR engine, TableFormer mode, and enrichments. Defaults match Docling's recommended preset: Heron layout, auto OCR, accurate tables.",
      (ctx) => <ParametersScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "processing",
      "DocumentConverter run",
      "On run, Docling executes the full conversion pipeline internally. Progress may take several minutes for large documents.",
      (ctx) => <ProcessingScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "output-branch",
      "Output & Document Branch",
      "Outputs DocumentArtifact plus markdown. Expand to node on the canvas to open Document Branch with markdown and JSON preview tabs for the converted document.",
      (ctx) => <OutputBranchScene ctx={ctx} />,
    ),
  ],
};
