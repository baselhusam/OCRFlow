"use client";

import {
  LayoutOutputBranchScene,
  LayoutPageInputScene,
  LayoutParamsScene,
  LayoutPipelineRoleScene,
  LayoutProcessingScene,
  layoutGuideStep,
  type LayoutRegionPreview,
} from "@/components/canvas/node-guide/guides/layout-guide-shared";
import type { NodeGuideDefinition } from "@/lib/canvas/node-guide-types";

const PADDLE_PROVIDER = "paddle";

const PADDLE_REGIONS: LayoutRegionPreview[] = [
  {
    id: "block-1",
    label: "title · 0.97",
    top: "9%",
    left: "8%",
    width: "60%",
    height: "10%",
    tone: "primary",
  },
  {
    id: "block-2",
    label: "text · 0.92",
    top: "24%",
    left: "8%",
    width: "56%",
    height: "28%",
    tone: "secondary",
  },
  {
    id: "block-3",
    label: "table · 0.89",
    top: "58%",
    left: "8%",
    width: "80%",
    height: "24%",
    tone: "primary",
  },
  {
    id: "block-4",
    label: "figure · 0.81",
    top: "24%",
    left: "70%",
    width: "20%",
    height: "26%",
    tone: "tertiary",
  },
];

const PADDLE_BRANCH_REGIONS = [
  { id: "r1", label: "title · 0.97" },
  { id: "r2", label: "text · 0.92" },
  { id: "r3", label: "table · 0.89" },
];

export const PADDLE_DOCLAYOUT_S_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "paddle/doclayout-s",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Layout detection",
      "PaddleOCR PP-DocLayout-S detects document regions — titles, text, tables, figures, formulas — with confidence-scored boxes. Wire it before OCR, table structure, or reading order.",
      (ctx) => (
        <LayoutPipelineRoleScene
          ctx={ctx}
          provider={PADDLE_PROVIDER}
          downstreamTitle="Paddle OCR"
          downstreamProvider={PADDLE_PROVIDER}
          tagline="PP-DocLayout-S · lightweight (1.2M) layout model, Apache-2.0"
        />
      ),
    ),
    layoutGuideStep(
      "page-input",
      "Page input",
      "Connect a single PageArtifact from Select Page, PDF Loader, or Image Loader. PP-DocLayout analyzes the full page image in one pass.",
      (ctx) => <LayoutPageInputScene ctx={ctx} provider={PADDLE_PROVIDER} />,
    ),
    layoutGuideStep(
      "parameters",
      "Confidence filter",
      "Confidence threshold drops low-scoring region proposals. Raise it to keep only high-confidence blocks; lower it to capture more layout candidates.",
      (ctx) => (
        <LayoutParamsScene
          ctx={ctx}
          provider={PADDLE_PROVIDER}
          fields={[
            {
              label: "Confidence",
              value: 0.5,
              hint: "0 – 1 · default 0.5",
            },
          ]}
          footerNote="PaddleOCR · Apache-2.0 · self-hostable"
        />
      ),
    ),
    layoutGuideStep(
      "processing",
      "Region detection",
      "PP-DocLayout scans the page and returns labeled regions with confidence scores. Each box becomes a routable output on the Region Branch panel.",
      (ctx) => (
        <LayoutProcessingScene
          ctx={ctx}
          provider={PADDLE_PROVIDER}
          regions={PADDLE_REGIONS}
          modelBadge="doclayout-s"
          statusText="detecting regions…"
        />
      ),
    ),
    layoutGuideStep(
      "output-branch",
      "Output & Region Branch",
      "Outputs PageArtifact + regions[]. The raw paddle label is preserved on each region. Connect to Paddle OCR, table structure, or reading order — or expand to open Region Branch with per-block ports.",
      (ctx) => (
        <LayoutOutputBranchScene
          ctx={ctx}
          provider={PADDLE_PROVIDER}
          downstreamTitle="Paddle OCR"
          downstreamProvider={PADDLE_PROVIDER}
          branchRegions={PADDLE_BRANCH_REGIONS}
          outputNote="PageArtifact + regions[] · provider_label kept for debugging"
        />
      ),
    ),
  ],
};
