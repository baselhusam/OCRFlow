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

const DOCLING_PROVIDER = "docling";

const DOCLING_REGIONS: LayoutRegionPreview[] = [
  {
    id: "title",
    label: "title",
    top: "8%",
    left: "10%",
    width: "52%",
    height: "10%",
    tone: "primary",
  },
  {
    id: "text",
    label: "text",
    top: "22%",
    left: "10%",
    width: "52%",
    height: "28%",
    tone: "secondary",
  },
  {
    id: "table",
    label: "table",
    top: "56%",
    left: "10%",
    width: "48%",
    height: "22%",
    tone: "primary",
  },
  {
    id: "picture",
    label: "picture",
    top: "22%",
    left: "66%",
    width: "24%",
    height: "38%",
    tone: "tertiary",
  },
];

const DOCLING_BRANCH_REGIONS = [
  { id: "r1", label: "title" },
  { id: "r2", label: "text" },
  { id: "r3", label: "table" },
];

export const DOCLING_LAYOUT_HERON_NODE_GUIDE: NodeGuideDefinition = {
  modelId: "docling/layout-heron",
  steps: [
    layoutGuideStep(
      "pipeline-role",
      "Layout detection",
      "Docling Layout Heron finds semantic regions on a page — titles, paragraphs, tables, figures, and more. Downstream nodes use these regions for OCR, tables, and captions.",
      (ctx) => (
        <LayoutPipelineRoleScene
          ctx={ctx}
          provider={DOCLING_PROVIDER}
          downstreamTitle="Docling OCR"
          downstreamProvider={DOCLING_PROVIDER}
          tagline="Docling Heron · RT-DETRv2 layout model with semantic region labels"
        />
      ),
    ),
    layoutGuideStep(
      "page-input",
      "Page input",
      "Connect a single PageArtifact from Select Page, PDF Loader, or Image Loader. The model analyzes the rasterized page image — one page per run.",
      (ctx) => <LayoutPageInputScene ctx={ctx} provider={DOCLING_PROVIDER} />,
    ),
    layoutGuideStep(
      "parameters",
      "Heron options",
      "Keep empty clusters retains low-confidence region proposals. Skip cell assignment defers table cell matching to a later TableFormer stage.",
      (ctx) => (
        <LayoutParamsScene
          ctx={ctx}
          provider={DOCLING_PROVIDER}
          fields={[
            {
              label: "Keep empty clusters",
              value: false,
              hint: "Include empty layout proposals",
            },
            {
              label: "Skip cell assignment",
              value: true,
              hint: "Default on · cells matched later",
            },
          ]}
          footerNote="docling-layout-heron · ~43M params"
        />
      ),
    ),
    layoutGuideStep(
      "processing",
      "Region detection",
      "Heron runs Docling's LayoutPredictor over the page and returns labeled bounding boxes — each region carries a docling_label for downstream routing.",
      (ctx) => (
        <LayoutProcessingScene
          ctx={ctx}
          provider={DOCLING_PROVIDER}
          regions={DOCLING_REGIONS}
          modelBadge="heron"
          statusText="labeling regions…"
        />
      ),
    ),
    layoutGuideStep(
      "output-branch",
      "Output & Region Branch",
      "Outputs PageArtifact + regions[]. Wire to OCR, TableFormer, or picture classifiers. Expand to node on the canvas to spawn a Region Branch with one output port per region.",
      (ctx) => (
        <LayoutOutputBranchScene
          ctx={ctx}
          provider={DOCLING_PROVIDER}
          downstreamTitle="TableFormer"
          downstreamProvider={DOCLING_PROVIDER}
          branchRegions={DOCLING_BRANCH_REGIONS}
          outputNote="PageArtifact + regions[] · per-region wires from Region Branch"
        />
      ),
    ),
  ],
};
