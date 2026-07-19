"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, FileText, ImageIcon, Sparkles } from "lucide-react";
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

const SAMPLE_CAPTION =
  "A bar chart comparing quarterly revenue across three product lines.";

type FigurePreview = {
  id: string;
  label: string;
  top: string;
  left: string;
  width: string;
  height: string;
};

const SAMPLE_FIGURES: FigurePreview[] = [
  {
    id: "f1",
    label: "picture",
    top: "28%",
    left: "58%",
    width: "32%",
    height: "38%",
  },
  {
    id: "f2",
    label: "chart",
    top: "62%",
    left: "12%",
    width: "36%",
    height: "24%",
  },
];

function FigurePagePreview({
  accentColor,
  figures,
  highlightId,
  reveal,
}: {
  accentColor: string;
  figures: FigurePreview[];
  highlightId?: string;
  reveal: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative overflow-hidden rounded-md border border-border bg-card shadow-sm"
      style={{ width: 132, height: 164 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/35 to-secondary/10" />
      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded bg-card/90 px-1 py-0.5 shadow-sm">
        <ProviderLogo provider={DOCLING_PROVIDER} size={12} />
        <span className="font-mono text-[7px] tracking-wide text-muted-foreground uppercase">
          smolvlm
        </span>
      </div>
      <div
        className="absolute top-[14%] left-[10%] rounded-[2px] border border-border/60 bg-card/50"
        style={{ width: "44%", height: "48%" }}
        aria-hidden
      />
      {figures.map((figure, index) => {
        const isHighlighted = figure.id === highlightId;
        return (
          <motion.div
            key={figure.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{
              opacity: reveal ? 1 : 0,
              scale: reveal ? 1 : 0.94,
            }}
            transition={{
              delay: reduceMotion ? 0 : 0.15 + index * 0.12,
              duration: 0.35,
              ease: STEP_EASE,
            }}
            className="absolute rounded-[3px] border-2"
            style={{
              top: figure.top,
              left: figure.left,
              width: figure.width,
              height: figure.height,
              borderColor: isHighlighted
                ? accentColor
                : `color-mix(in srgb, ${accentColor} 45%, var(--border))`,
              backgroundColor: isHighlighted
                ? `color-mix(in srgb, ${accentColor} 22%, transparent)`
                : `color-mix(in srgb, ${accentColor} 10%, transparent)`,
              boxShadow: isHighlighted
                ? `0 0 0 3px color-mix(in srgb, ${accentColor} 18%, transparent)`
                : undefined,
            }}
          >
            <ImageIcon
              className="absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 opacity-50"
              style={{ color: accentColor }}
              aria-hidden
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function CaptionBranchMiniPanel({
  accentColor,
  captions,
  reveal,
}: {
  accentColor: string;
  captions: Array<{ id: string; text: string }>;
  reveal: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="w-[156px] overflow-hidden rounded-[10px] border bg-card shadow-sm"
      style={{ borderColor: `color-mix(in srgb, ${accentColor} 40%, var(--border))` }}
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <SegmentMark size={14} className="shrink-0 text-foreground" />
        <span className="font-mono text-[8px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Caption Branch
        </span>
      </div>
      <div className="space-y-1 p-1.5">
        {captions.map((caption, index) => (
          <motion.div
            key={caption.id}
            initial={reduceMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: reveal ? 1 : 0, x: reveal ? 0 : 8 }}
            transition={{
              delay: reduceMotion ? 0 : 0.1 + index * 0.08,
              duration: 0.3,
              ease: STEP_EASE,
            }}
            className="relative flex items-start gap-1 rounded border border-border/70 bg-secondary/20 px-1.5 py-1"
          >
            <FileText
              className="mt-0.5 size-2.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <p className="line-clamp-2 min-w-0 flex-1 font-mono text-[7px] leading-snug text-foreground">
              {caption.text}
            </p>
            <span
              aria-hidden
              className="absolute top-1/2 -right-1 size-1.5 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PipelineRoleScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ProviderBrandedNodeCard
            title="Picture Classifier"
            provider={DOCLING_PROVIDER}
            output="Figure[]"
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={DOCLING_PROVIDER}
            output="SmolVLM captions"
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
          SmolVLM-256M · vision-language figure descriptions
        </div>
      </div>
    </StepScene>
  );
}

function FigureInputScene({ ctx }: { ctx: NodeGuideContext }) {
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
          <ProviderBrandedNodeCard
            title="Picture Classifier"
            provider={DOCLING_PROVIDER}
            output="→ Figure[]"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={isConnected && !reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={DOCLING_PROVIDER}
            output="figures in"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
        </div>
        <FigurePagePreview
          accentColor={ctx.categoryColor}
          figures={SAMPLE_FIGURES}
          reveal={isConnected}
        />
        <p className="max-w-[270px] text-center font-mono text-[10px] text-muted-foreground">
          Input: Figure[] · bbox crops from layout or Picture Classifier
        </p>
      </div>
    </StepScene>
  );
}

function ParametersScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [highlightTokens, setHighlightTokens] = useState(false);
  const [highlightPreset, setHighlightPreset] = useState(false);
  const showTokens = reduceMotion || highlightTokens;
  const showPreset = reduceMotion || highlightPreset;

  useEffect(() => {
    if (reduceMotion) return;
    const tokensTimer = window.setTimeout(() => setHighlightTokens(true), 400);
    const presetTimer = window.setTimeout(() => setHighlightPreset(true), 900);
    return () => {
      window.clearTimeout(tokensTimer);
      window.clearTimeout(presetTimer);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[280px] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-2">
          <ProviderLogo provider={DOCLING_PROVIDER} size={20} />
          <span className="text-xs font-medium text-foreground">VLM options</span>
        </div>
        <GuideParamField
          label="Max tokens"
          value={256}
          hint="1 – 2048 · caption length cap"
          accentColor={ctx.categoryColor}
          highlighted={showTokens}
        />
        <GuideParamField
          label="Preset"
          value="smolvlm"
          hint="SmolVLM-256M · read-only"
          accentColor={ctx.categoryColor}
          highlighted={showPreset}
        />
      </div>
    </StepScene>
  );
}

function VlmProcessingScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 76 : 20);
  const [captionChars, setCaptionChars] = useState(reduceMotion ? SAMPLE_CAPTION.length : 0);
  const [highlightFigure, setHighlightFigure] = useState("f1");

  useEffect(() => {
    if (reduceMotion) return;
    const progressInterval = window.setInterval(() => {
      setProgress((value) => (value >= 94 ? 20 : value + 11));
    }, 420);
    let charIndex = 0;
    const typeInterval = window.setInterval(() => {
      charIndex += 1;
      setCaptionChars(charIndex);
      if (charIndex >= SAMPLE_CAPTION.length) {
        window.clearInterval(typeInterval);
        setHighlightFigure("f2");
      }
    }, 28);
    return () => {
      window.clearInterval(progressInterval);
      window.clearInterval(typeInterval);
    };
  }, [reduceMotion]);

  const typedCaption = SAMPLE_CAPTION.slice(0, captionChars);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <FigurePagePreview
          accentColor={ctx.categoryColor}
          figures={SAMPLE_FIGURES}
          highlightId={highlightFigure}
          reveal
        />
        <div
          className="w-full max-w-[240px] rounded-lg border px-2.5 py-2"
          style={{
            borderColor: `color-mix(in srgb, ${ctx.categoryColor} 35%, var(--border))`,
            backgroundColor: `color-mix(in srgb, ${ctx.categoryColor} 6%, var(--card))`,
          }}
        >
          <p className="font-mono text-[8px] tracking-[0.1em] text-muted-foreground uppercase">
            Prompt
          </p>
          <p className="mt-1 text-[10px] text-foreground/80">
            Describe this figure.
          </p>
          <p className="mt-2 min-h-[2.5rem] font-mono text-[9px] leading-relaxed text-foreground">
            {typedCaption}
            {!reduceMotion && captionChars < SAMPLE_CAPTION.length && (
              <span className="animate-pulse">|</span>
            )}
          </p>
        </div>
        <ProviderBrandedNodeCard
          title={ctx.data.label}
          provider={DOCLING_PROVIDER}
          output="generating captions…"
          active
          progress={progress}
          accentColor={ctx.categoryColor}
        />
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

  const branchCaptions = [
    {
      id: "f1",
      text: "Bar chart: quarterly revenue by product line.",
    },
    {
      id: "f2",
      text: "Line graph: user growth over six months.",
    },
  ];

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
            output="merge captions"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <div className="flex flex-wrap items-start justify-center gap-3">
          <CaptionBranchMiniPanel
            accentColor={ctx.categoryColor}
            captions={branchCaptions}
            reveal={expanded}
          />
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
            Expand to node → Caption Branch
          </motion.div>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {branchCaptions.map((caption, index) => (
            <motion.span
              key={caption.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: expanded ? 1 : 0, scale: expanded ? 1 : 0.92 }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.1,
                duration: 0.3,
                ease: STEP_EASE,
              }}
            >
              <GuideWireBadge label={caption.id} accentColor={ctx.categoryColor} />
            </motion.span>
          ))}
        </div>
        <p className="max-w-[280px] text-center font-mono text-[10px] text-muted-foreground">
          One TextLine per figure · id, bbox, and description text
        </p>
      </div>
    </StepScene>
  );
}

export const DOCLING_PICTURE_DESCRIPTION_SMOLVLM_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "docling/picture-description-smolvlm",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Figure captioning",
      "Picture Description SmolVLM generates natural-language captions for figures on a page. It uses Docling's compact SmolVLM vision-language model to describe charts, images, and diagrams.",
      (ctx) => <PipelineRoleScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "figure-input",
      "Figure input",
      "Wire Figure[] from Picture Classifier or a Region Branch figure port. Each figure includes a bounding box used to crop the page image before VLM inference.",
      (ctx) => <FigureInputScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "parameters",
      "SmolVLM options",
      "Max tokens caps the generated caption length. The preset is fixed to smolvlm (SmolVLM-256M) for this node.",
      (ctx) => <ParametersScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "vlm-processing",
      "VLM inference",
      "Each figure crop is sent to SmolVLM with the prompt \"Describe this figure.\" The model returns a text description stored on the output TextLine.",
      (ctx) => <VlmProcessingScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "output-branch",
      "Output & Caption Branch",
      "Outputs TextLine[] — one caption per figure. Expand to node on the canvas to open Caption Branch with a text output port for each described figure.",
      (ctx) => <OutputBranchScene ctx={ctx} />,
    ),
  ],
};
