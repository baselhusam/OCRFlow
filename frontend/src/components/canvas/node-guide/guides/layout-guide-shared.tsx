"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import { SegmentMark } from "@/components/brand/segment-mark";
import {
  FlowConnector,
  GuideParamField,
  GuideWireBadge,
  MiniNodeCard,
  StepScene,
} from "@/components/canvas/node-guide/node-guide-primitives";
import type { NodeGuideContext } from "@/lib/canvas/node-guide-types";
import { cn } from "@/lib/utils";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;

export type LayoutRegionPreview = {
  id: string;
  label: string;
  top: string;
  left: string;
  width: string;
  height: string;
  tone?: "primary" | "secondary" | "tertiary";
};

type ProviderBrandedNodeCardProps = {
  title: string;
  provider: string;
  output?: string;
  active?: boolean;
  progress?: number;
  accentColor: string;
  ghost?: boolean;
};

export function ProviderBrandedNodeCard({
  title,
  provider,
  output,
  active = false,
  progress,
  accentColor,
  ghost = false,
}: ProviderBrandedNodeCardProps) {
  return (
    <div
      className={cn(
        "relative min-w-[136px] rounded-[10px] border bg-card",
        ghost && "opacity-60",
      )}
      style={{
        borderColor: active ? accentColor : "var(--border)",
        boxShadow: active
          ? `0 0 0 3px color-mix(in srgb, ${accentColor} 22%, transparent)`
          : undefined,
      }}
    >
      <span
        aria-hidden
        className="absolute top-1/2 -left-1.5 size-2 -translate-y-1/2 rounded-full border-2 border-card bg-muted-foreground"
      />
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <ProviderLogo provider={provider} size={16} className="shrink-0" />
        <span className="truncate text-[11px] font-semibold text-foreground">
          {title}
        </span>
      </div>
      {output && (
        <div className="px-2.5 py-2 font-mono text-[9.5px] text-muted-foreground">
          {output}
          {active && progress !== undefined && (
            <>
              {" "}
              <span style={{ color: accentColor }}>{progress}%</span>
            </>
          )}
        </div>
      )}
      {active && progress !== undefined && (
        <div className="h-[3px] overflow-hidden rounded-b-[9px] bg-border">
          <span
            className="block h-[3px] animate-[ocrflow-node-progress_1.4s_ease-in-out_infinite]"
            style={{ width: `${progress}%`, backgroundColor: accentColor }}
          />
        </div>
      )}
      <span
        aria-hidden
        className="absolute top-1/2 -right-1.5 size-2 -translate-y-1/2 rounded-full border-2 border-card"
        style={{
          backgroundColor: active ? accentColor : "var(--muted-foreground)",
        }}
      />
    </div>
  );
}

function regionToneColor(
  accentColor: string,
  tone: LayoutRegionPreview["tone"] = "primary",
): string {
  if (tone === "secondary") {
    return `color-mix(in srgb, ${accentColor} 55%, var(--muted-foreground))`;
  }
  if (tone === "tertiary") {
    return `color-mix(in srgb, ${accentColor} 35%, var(--border))`;
  }
  return accentColor;
}

type LayoutPageRegionsProps = {
  accentColor: string;
  regions: LayoutRegionPreview[];
  reveal?: boolean;
  provider?: string;
  modelBadge?: string;
};

export function LayoutPageRegions({
  accentColor,
  regions,
  reveal = true,
  provider,
  modelBadge,
}: LayoutPageRegionsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-md border border-border bg-card shadow-sm"
        style={{ width: 120, height: 156 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 to-secondary/10" />
        {provider && (
          <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded bg-card/90 px-1 py-0.5 shadow-sm">
            <ProviderLogo provider={provider} size={12} />
            {modelBadge && (
              <span className="font-mono text-[7px] tracking-wide text-muted-foreground uppercase">
                {modelBadge}
              </span>
            )}
          </div>
        )}
        {regions.map((region, index) => (
          <motion.div
            key={region.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{
              opacity: reveal ? 0.92 : 0,
              scale: reveal ? 1 : 0.92,
            }}
            transition={{
              delay: reduceMotion ? 0 : 0.15 + index * 0.12,
              duration: 0.35,
              ease: STEP_EASE,
            }}
            className="absolute rounded-[3px] border-2"
            style={{
              top: region.top,
              left: region.left,
              width: region.width,
              height: region.height,
              borderColor: regionToneColor(accentColor, region.tone),
              backgroundColor: `color-mix(in srgb, ${regionToneColor(accentColor, region.tone)} 18%, transparent)`,
            }}
          >
            {reveal && (
              <span
                className="absolute -top-4 left-0 max-w-[72px] truncate rounded px-1 py-px font-mono text-[7px] text-foreground/80"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 12%, var(--card))`,
                }}
              >
                {region.label}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

type RegionBranchMiniPanelProps = {
  accentColor: string;
  regions: Array<{ id: string; label: string }>;
  provider: string;
  reveal?: boolean;
};

export function RegionBranchMiniPanel({
  accentColor,
  regions,
  provider,
  reveal = true,
}: RegionBranchMiniPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="w-[148px] overflow-hidden rounded-[10px] border bg-card shadow-sm"
      style={{ borderColor: `color-mix(in srgb, ${accentColor} 40%, var(--border))` }}
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <SegmentMark size={14} className="shrink-0 text-foreground" />
        <span className="font-mono text-[8px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Region Branch
        </span>
      </div>
      <div className="space-y-1 p-1.5">
        {regions.map((region, index) => (
          <motion.div
            key={region.id}
            initial={reduceMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: reveal ? 1 : 0, x: reveal ? 0 : 8 }}
            transition={{
              delay: reduceMotion ? 0 : 0.1 + index * 0.08,
              duration: 0.3,
              ease: STEP_EASE,
            }}
            className="relative flex items-center gap-1.5 rounded border border-border/70 bg-secondary/20 px-1.5 py-1"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[8px] text-foreground">{region.label}</p>
            </div>
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </motion.div>
        ))}
      </div>
      <div className="border-t border-border/60 px-2 py-1">
        <p className="font-mono text-[7px] text-muted-foreground">
          via {provider} layout
        </p>
      </div>
    </div>
  );
}

type LayoutPipelineRoleSceneProps = {
  ctx: NodeGuideContext;
  provider: string;
  downstreamTitle: string;
  downstreamProvider: string;
  tagline: string;
};

export function LayoutPipelineRoleScene({
  ctx,
  provider,
  downstreamTitle,
  downstreamProvider,
  tagline,
}: LayoutPipelineRoleSceneProps) {
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
            provider={provider}
            output="detecting…"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={downstreamTitle}
            provider={downstreamProvider}
            output="regions in"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <p className="max-w-[280px] text-center font-mono text-[10px] text-muted-foreground">
          {tagline}
        </p>
      </div>
    </StepScene>
  );
}

type LayoutPageInputSceneProps = {
  ctx: NodeGuideContext;
  provider: string;
};

export function LayoutPageInputScene({ ctx, provider }: LayoutPageInputSceneProps) {
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
            provider={provider}
            output="page image in"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
        </div>
        <GuideWireBadge label="PageArtifact" accentColor={ctx.categoryColor} />
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Input: single page image · wire from Select Page or loader
        </p>
      </div>
    </StepScene>
  );
}

type LayoutParamField = {
  label: string;
  value: string | number | boolean;
  hint?: string;
};

type LayoutParamsSceneProps = {
  ctx: NodeGuideContext;
  provider: string;
  fields: LayoutParamField[];
  footerNote: string;
};

export function LayoutParamsScene({
  ctx,
  provider,
  fields,
  footerNote,
}: LayoutParamsSceneProps) {
  const reduceMotion = useReducedMotion();
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    if (reduceMotion) return;
    const timers = fields.map((_, index) =>
      window.setTimeout(() => setHighlightIndex(index), 400 + index * 500),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduceMotion, fields]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[280px] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-2">
          <ProviderLogo provider={provider} size={20} />
          <span className="text-xs font-medium text-foreground">Model options</span>
        </div>
        {fields.map((field, index) => (
          <GuideParamField
            key={field.label}
            label={field.label}
            value={
              typeof field.value === "boolean"
                ? field.value
                  ? "true"
                  : "false"
                : field.value
            }
            hint={field.hint}
            accentColor={ctx.categoryColor}
            highlighted={reduceMotion ? true : highlightIndex >= index}
          />
        ))}
        <p className="font-mono text-[9px] text-muted-foreground">{footerNote}</p>
      </div>
    </StepScene>
  );
}

type LayoutProcessingSceneProps = {
  ctx: NodeGuideContext;
  provider: string;
  regions: LayoutRegionPreview[];
  modelBadge: string;
  statusText: string;
};

export function LayoutProcessingScene({
  ctx,
  provider,
  regions,
  modelBadge,
  statusText,
}: LayoutProcessingSceneProps) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 78 : 22);
  const [revealed, setRevealed] = useState(reduceMotion ?? false);

  useEffect(() => {
    if (reduceMotion) return;
    const revealTimer = window.setTimeout(() => setRevealed(true), 500);
    const interval = window.setInterval(() => {
      setProgress((value) => (value >= 94 ? 22 : value + 12));
    }, 420);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearInterval(interval);
    };
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <LayoutPageRegions
          accentColor={ctx.categoryColor}
          regions={regions}
          reveal={revealed}
          provider={provider}
          modelBadge={modelBadge}
        />
        <ProviderBrandedNodeCard
          title={ctx.data.label}
          provider={provider}
          output={statusText}
          active
          progress={progress}
          accentColor={ctx.categoryColor}
        />
      </div>
    </StepScene>
  );
}

type LayoutOutputBranchSceneProps = {
  ctx: NodeGuideContext;
  provider: string;
  downstreamTitle: string;
  downstreamProvider: string;
  branchRegions: Array<{ id: string; label: string }>;
  outputNote: string;
};

export function LayoutOutputBranchScene({
  ctx,
  provider,
  downstreamTitle,
  downstreamProvider,
  branchRegions,
  outputNote,
}: LayoutOutputBranchSceneProps) {
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
        <div className="flex flex-wrap items-start justify-center gap-3">
          <ProviderBrandedNodeCard
            title={ctx.data.label}
            provider={provider}
            output="→ regions[]"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <ProviderBrandedNodeCard
            title={downstreamTitle}
            provider={downstreamProvider}
            output="per region"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <div className="flex flex-wrap items-start justify-center gap-3">
          <RegionBranchMiniPanel
            accentColor={ctx.categoryColor}
            regions={branchRegions}
            provider={provider}
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
            Expand to node → Region Branch
          </motion.div>
        </div>
        <p className="max-w-[280px] text-center font-mono text-[10px] text-muted-foreground">
          {outputNote}
        </p>
      </div>
    </StepScene>
  );
}

export function layoutGuideStep(
  id: string,
  title: string,
  description: string,
  render: (ctx: NodeGuideContext) => ReactNode,
) {
  return { id, title, description, render };
}
