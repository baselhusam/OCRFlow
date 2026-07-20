"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LayoutGrid, Table2 } from "lucide-react";

import {
  LayoutPageInputScene,
  LayoutProcessingScene,
  layoutGuideStep,
  ProviderBrandedNodeCard,
  type LayoutRegionPreview,
} from "@/components/canvas/node-guide/guides/layout-guide-shared";
import {
  FlowConnector,
  MiniNodeCard,
  StepScene,
} from "@/components/canvas/node-guide/node-guide-primitives";
import type {
  NodeGuideContext,
  NodeGuideDefinition,
} from "@/lib/canvas/node-guide-types";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const PADDLE_PROVIDER = "paddle";

const STRUCTURE_REGIONS: LayoutRegionPreview[] = [
  { id: "s1", label: "title", top: "9%", left: "8%", width: "62%", height: "9%", tone: "primary" },
  { id: "s2", label: "text", top: "22%", left: "8%", width: "54%", height: "22%", tone: "secondary" },
  { id: "s3", label: "table", top: "50%", left: "8%", width: "82%", height: "30%", tone: "primary" },
  { id: "s4", label: "figure", top: "22%", left: "68%", width: "22%", height: "22%", tone: "tertiary" },
];

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
            output="parse document"
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
        <p className="max-w-[290px] text-center font-mono text-[10px] text-muted-foreground">
          PP-StructureV3 · layout + OCR + tables in one node
        </p>
      </div>
    </StepScene>
  );
}

function OutputScene({ ctx }: { ctx: NodeGuideContext }) {
  const reduceMotion = useReducedMotion();
  const rows = [
    { id: "regions", icon: LayoutGrid, label: "regions[]", note: "layout blocks + labels" },
    { id: "lines", icon: Table2, label: "lines[]", note: "recognized text" },
    { id: "tables", icon: Table2, label: "tables[]", note: "structure + HTML" },
  ];

  return (
    <StepScene accentColor={ctx.categoryColor}>
      <div className="flex flex-col items-center gap-4">
        <ProviderBrandedNodeCard
          title={ctx.data.label}
          provider={PADDLE_PROVIDER}
          output="→ PageArtifact"
          active
          accentColor={ctx.categoryColor}
        />
        <div className="w-full max-w-[260px] space-y-1.5 rounded-lg border border-border bg-card/80 p-2.5">
          <p className="font-mono text-[8px] tracking-[0.12em] text-muted-foreground uppercase">
            Page artifact output
          </p>
          {rows.map((row, index) => (
            <motion.div
              key={row.id}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.1,
                duration: 0.3,
                ease: STEP_EASE,
              }}
              className="flex items-center gap-2 rounded border border-border/70 bg-secondary/20 px-2 py-1"
            >
              <row.icon
                className="size-3 shrink-0"
                style={{ color: ctx.categoryColor }}
                aria-hidden
              />
              <span className="font-mono text-[9px] font-semibold text-foreground">
                {row.label}
              </span>
              <span className="truncate font-mono text-[8px] text-muted-foreground">
                {row.note}
              </span>
            </motion.div>
          ))}
        </div>
        <p className="max-w-[280px] text-center font-mono text-[10px] text-muted-foreground">
          One flattened PageArtifact · connect regions downstream to reading order or exporters
        </p>
      </div>
    </StepScene>
  );
}

export const PADDLE_PP_STRUCTURE_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "paddle/pp-structure",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Document parsing",
      "PaddleOCR PP-StructureV3 is a full document-parsing pipeline — it runs layout detection, OCR, and table recognition together and returns one structured page.",
      (ctx) => <PipelineRoleScene ctx={ctx} />,
    ),
    layoutGuideStep(
      "page-input",
      "Page input",
      "Connect a single PageArtifact from a loader or Select Page. PP-StructureV3 processes the whole page — no separate layout or OCR nodes needed upstream.",
      (ctx) => <LayoutPageInputScene ctx={ctx} provider={PADDLE_PROVIDER} />,
    ),
    layoutGuideStep(
      "processing",
      "Parse everything",
      "The pipeline detects regions, reads text lines, and reconstructs table structure — all on the same page image.",
      (ctx) => (
        <LayoutProcessingScene
          ctx={ctx}
          provider={PADDLE_PROVIDER}
          regions={STRUCTURE_REGIONS}
          modelBadge="pp-structure"
          statusText="parsing document…"
        />
      ),
    ),
    layoutGuideStep(
      "output",
      "Page artifact output",
      "Outputs a flattened PageArtifact: regions[] (layout), lines[] (OCR text), and tables[] (structure + HTML). Wire the regions downstream, or send it to an assembler / exporter.",
      (ctx) => <OutputScene ctx={ctx} />,
    ),
  ],
};
