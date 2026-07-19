"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
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

function PipelineBridgeScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <MiniNodeCard
          title="PDF Loader"
          output="PageArtifact[]"
          accentColor={ctx.categoryColor}
        />
        <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
        <MiniNodeCard
          title={ctx.data.label}
          output="page bridge"
          active
          accentColor={ctx.categoryColor}
        />
        <FlowConnector accentColor={ctx.categoryColor} />
        <MiniNodeCard
          title="Layout"
          output="PageArtifact"
          ghost
          accentColor={ctx.categoryColor}
        />
      </div>
      <p className="mt-4 max-w-[260px] text-center font-mono text-[10px] text-muted-foreground">
        Narrows a multi-page document to one page for downstream stages
      </p>
    </StepScene>
  );
}

function UpstreamInputScene({ ctx }: { ctx: NodeGuideContext }) {
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
            title="PDF Loader"
            output="→ PageArtifact[]"
            active={isConnected}
            accentColor={ctx.categoryColor}
            source
          />
          <FlowConnector animated={isConnected && !reduceMotion} accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title={ctx.data.label}
            output="awaiting pages"
            active={isConnected}
            accentColor={ctx.categoryColor}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {["p.1", "p.2", "p.3"].map((page, index) => (
            <motion.span
              key={page}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{
                opacity: isConnected ? 1 : 0,
                y: isConnected ? 0 : 6,
              }}
              transition={{
                delay: reduceMotion ? 0 : 0.2 + index * 0.1,
                duration: 0.35,
                ease: STEP_EASE,
              }}
            >
              <GuideWireBadge label={page} accentColor={ctx.categoryColor} />
            </motion.span>
          ))}
        </div>
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Input: PageArtifact[] · wire from PDF or Image Loader
        </p>
      </div>
    </StepScene>
  );
}

function PageSelectionScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [selectedPage, setSelectedPage] = useState(1);
  const displayPage = reduceMotion ? 2 : selectedPage;

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setSelectedPage(2), 800);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex w-full max-w-[240px] flex-col gap-4">
        <div className="rounded-lg border border-border bg-card/90 px-3 py-3">
          <p className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
            Page number
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground"
            >
              <Minus className="size-3" />
            </button>
            <motion.span
              key={displayPage}
              initial={reduceMotion ? false : { scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: STEP_EASE }}
              className="min-w-[2.5rem] text-center text-lg font-semibold tabular-nums text-foreground"
            >
              {displayPage}
            </motion.span>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[9px] text-muted-foreground">
            of 5 pages
          </p>
        </div>
        <GuideParamField
          label="Stored index"
          value={displayPage - 1}
          hint="0-based internally · page 1 = index 0"
          accentColor={ctx.categoryColor}
          highlighted={displayPage === 2}
        />
      </div>
    </StepScene>
  );
}

function ProcessingScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = reduceMotion ? 1 : selectedIndex;

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setSelectedIndex(1), 700);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-2">
          {[0, 1, 2].map((index) => {
            const isActive = index === activeIndex;
            return (
              <motion.div
                key={index}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  opacity: isActive ? 1 : 0.45,
                }}
                transition={{ duration: 0.35, ease: STEP_EASE }}
                className="rounded-sm border bg-card shadow-sm"
                style={{
                  width: 34,
                  height: 44,
                  borderColor: isActive
                    ? ctx.categoryColor
                    : "var(--border)",
                  boxShadow: isActive
                    ? `0 0 0 3px color-mix(in srgb, ${ctx.categoryColor} 20%, transparent)`
                    : undefined,
                }}
              />
            );
          })}
        </div>
        <MiniNodeCard
          title={ctx.data.label}
          output={`extracting page ${activeIndex + 1}`}
          active
          accentColor={ctx.categoryColor}
        />
        <p className="font-mono text-[10px] text-muted-foreground">
          Passes through the existing page image — no re-rasterization
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
        <div className="flex flex-wrap items-center justify-center gap-2">
          <MiniNodeCard
            title={ctx.data.label}
            output="→ PageArtifact"
            active
            accentColor={ctx.categoryColor}
          />
          <FlowConnector animated={!reduceMotion} accentColor={ctx.categoryColor} />
          <MiniNodeCard
            title="Layout"
            output="regions[]"
            ghost
            accentColor={ctx.categoryColor}
          />
        </div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.25, duration: 0.35, ease: STEP_EASE }}
          className="mt-4 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px]"
          style={{
            borderColor: `color-mix(in srgb, ${ctx.categoryColor} 35%, var(--border))`,
            color: ctx.categoryColor,
            backgroundColor: `color-mix(in srgb, ${ctx.categoryColor} 8%, var(--card))`,
          }}
        >
          <ArrowUpRight className="size-3 shrink-0" aria-hidden />
          Expand to node for per-page branching
        </motion.div>
      </div>
    </StepScene>
  );
}

export const SELECT_PAGE_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "loader/page-at",
  steps: [
    {
      id: "pipeline-bridge",
      title: "Pipeline bridge",
      description:
        "Select Page sits between a page loader and downstream stages. It picks one page from a multi-page document so later nodes process a single page at a time.",
      render: (ctx) => <PipelineBridgeScene ctx={ctx} />,
    },
    {
      id: "upstream-input",
      title: "Upstream input",
      description:
        "Wire the output of PDF Loader or Image Loader into Select Page. The node receives PageArtifact[] — one artifact per loaded page.",
      render: (ctx) => <UpstreamInputScene ctx={ctx} />,
    },
    {
      id: "page-selection",
      title: "Page selection",
      description:
        "Choose which page to process in Setup using the page number picker. The UI shows pages as 1, 2, 3… while the stored index is 0-based.",
      render: (ctx) => <PageSelectionScene ctx={ctx} />,
    },
    {
      id: "processing",
      title: "Processing",
      description:
        "On run, Select Page extracts the chosen page from the upstream array. It passes through the existing rasterized image — no new conversion.",
      render: (ctx) => <ProcessingScene ctx={ctx} />,
    },
    {
      id: "output",
      title: "Output",
      description:
        "The node outputs a single PageArtifact. Wire it to layout detection, OCR, or any node that accepts one page. Use Expand to node on the canvas to open a Page Branch for per-page pipelines.",
      render: (ctx) => <OutputScene ctx={ctx} />,
    },
  ],
};
