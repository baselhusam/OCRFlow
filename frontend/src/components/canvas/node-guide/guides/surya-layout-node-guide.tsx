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

const SURYA_PROVIDER = "surya";

const SURYA_REGIONS: LayoutRegionPreview[] = [
  {
    id: "block-1",
    label: "0.94",
    top: "10%",
    left: "8%",
    width: "55%",
    height: "12%",
    tone: "primary",
  },
  {
    id: "block-2",
    label: "0.88",
    top: "26%",
    left: "8%",
    width: "55%",
    height: "30%",
    tone: "secondary",
  },
  {
    id: "block-3",
    label: "0.91",
    top: "62%",
    left: "8%",
    width: "42%",
    height: "20%",
    tone: "primary",
  },
  {
    id: "block-4",
    label: "0.76",
    top: "28%",
    left: "68%",
    width: "22%",
    height: "36%",
    tone: "tertiary",
  },
];

const SURYA_BRANCH_REGIONS = [
  { id: "r1", label: "region · 0.94" },
  { id: "r2", label: "region · 0.88" },
  { id: "r3", label: "region · 0.91" },
];

export const SURYA_LAYOUT_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "surya/layout",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Layout detection",
      "Surya Layout detects content blocks on a page with confidence-scored bounding boxes. It powers the Surya OCR stack — wire it before text detection, tables, or reading order.",
      (ctx) => (
        <LayoutPipelineRoleScene
          ctx={ctx}
          provider={SURYA_PROVIDER}
          downstreamTitle="Surya Text"
          downstreamProvider={SURYA_PROVIDER}
          tagline="Surya layout model · GPU-accelerated block detection for OCR pipelines"
        />
      ),
    ),
    layoutGuideStep(
      "page-input",
      "Page input",
      "Connect a single PageArtifact from Select Page, PDF Loader, or Image Loader. Surya analyzes the full page image in one inference pass.",
      (ctx) => <LayoutPageInputScene ctx={ctx} provider={SURYA_PROVIDER} />,
    ),
    layoutGuideStep(
      "parameters",
      "Confidence filter",
      "Confidence threshold filters out low-scoring region proposals. Raise it to keep only high-confidence blocks; lower it to capture more layout candidates.",
      (ctx) => (
        <LayoutParamsScene
          ctx={ctx}
          provider={SURYA_PROVIDER}
          fields={[
            {
              label: "Confidence",
              value: 0.5,
              hint: "0 – 1 · default 0.5",
            },
          ]}
          footerNote="Open-source Surya · GPL-3.0 weights"
        />
      ),
    ),
    layoutGuideStep(
      "processing",
      "Block detection",
      "Surya scans the page and returns regions with confidence scores. Each box becomes a routable output on the Region Branch panel.",
      (ctx) => (
        <LayoutProcessingScene
          ctx={ctx}
          provider={SURYA_PROVIDER}
          regions={SURYA_REGIONS}
          modelBadge="layout"
          statusText="detecting blocks…"
        />
      ),
    ),
    layoutGuideStep(
      "output-branch",
      "Output & Region Branch",
      "Outputs PageArtifact + regions[]. Connect to Surya text detection, table recognition, or reading order. Expand to node to open Region Branch with per-block output ports.",
      (ctx) => (
        <LayoutOutputBranchScene
          ctx={ctx}
          provider={SURYA_PROVIDER}
          downstreamTitle="Surya OCR"
          downstreamProvider={SURYA_PROVIDER}
          branchRegions={SURYA_BRANCH_REGIONS}
          outputNote="PageArtifact + regions[] · confidence on each region wire"
        />
      ),
    ),
  ],
};
