import type { Edge, Node } from "@xyflow/react";

import type { UpstreamContext, PageArtifactWire } from "@/lib/canvas/resolve-upstream";
import {
  extractLines,
  extractPageImage,
  extractPages,
  extractRegions,
  collectUpstreamChain,
  getUpstreamContext,
  upstreamSatisfiesInput,
} from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import {
  CONVERT_PIPELINE_LAYOUT_MODEL_OPTIONS,
  CONVERT_PIPELINE_OCR_ENGINE_OPTIONS,
  CONVERT_PIPELINE_TABLEFORMER_MODE_OPTIONS,
  DOCLING_OCR_LANGUAGE_OPTIONS,
  SURYA_LANGUAGE_OPTIONS,
  validateLanguageCodes,
} from "@/lib/canvas/node-param-schema";
import {
  getModelWireKinds,
  getNodeWireKinds,
  isCustomPipelineModelId,
  type WireKind,
} from "@/lib/canvas/wire-types";

export type NodeReadiness = {
  ready: boolean;
  issues: string[];
};

type NodeReadinessOptions = {
  /** Missing upstream output is OK when that upstream is in the auto-run chain. */
  deferUpstreamOutput?: boolean;
  chainNodeIds?: Set<string>;
};

export function validateNodeParams(
  modelId: string,
  params: Record<string, string | boolean | number>,
): string[] {
  const issues: string[] = [];

  if (modelId === "loader/pdf") {
    const dpi = Number(params.dpi ?? 200);
    const maxPages = Number(params.max_pages ?? 50);
    if (dpi < 72 || dpi > 600) issues.push("dpi must be between 72 and 600");
    if (maxPages < 1 || maxPages > 500) {
      issues.push("max_pages must be between 1 and 500");
    }
  }

  if (modelId === "loader/page-branch") {
    const pageIndex = Number(params.page_index ?? 0);
    if (pageIndex < 0) issues.push("Page number must be at least 1");
  }

  if (modelId === "docling/ocr-auto") {
    const raw = params.langs ?? params.languages ?? "eng";
    if (!validateLanguageCodes(raw, DOCLING_OCR_LANGUAGE_OPTIONS, "eng")) {
      issues.push("langs must use supported language codes");
    }
  }

  if (modelId === "surya/text-recognition") {
    if (!validateLanguageCodes(params.langs, SURYA_LANGUAGE_OPTIONS, "en")) {
      issues.push("langs must use supported language codes");
    }
  }

  if (modelId === "docling/convert-pipeline") {
    const layout = String(params.layout_model ?? "heron");
    if (!CONVERT_PIPELINE_LAYOUT_MODEL_OPTIONS.some((opt) => opt.value === layout)) {
      issues.push("layout_model must be a supported layout model");
    }
    const ocr = String(params.ocr_engine ?? "auto");
    if (!CONVERT_PIPELINE_OCR_ENGINE_OPTIONS.some((opt) => opt.value === ocr)) {
      issues.push("ocr_engine must be a supported OCR engine");
    }
    const tableMode = String(params.tableformer_mode ?? "accurate");
    if (!CONVERT_PIPELINE_TABLEFORMER_MODE_OPTIONS.some((opt) => opt.value === tableMode)) {
      issues.push("tableformer_mode must be accurate or fast");
    }
  }

  if (modelId.startsWith("ollama/")) {
    const model = String(
      params.model ??
        (modelId.includes("vision") ? "qwen3.5:0.8b" : "qwen3:0.6b"),
    );
    const allowedModels = modelId.includes("vision")
      ? ["qwen3.5:0.8b"]
      : ["qwen3:0.6b", "qwen3.5:0.8b"];
    if (!allowedModels.includes(model)) {
      issues.push("Select a supported local model under 1B parameters");
    }
    if (!String(params.prompt ?? "").trim()) {
      issues.push("Prompt is required");
    }
    const temperature = Number(params.temperature ?? 0);
    if (temperature < 0 || temperature > 2) {
      issues.push("temperature must be between 0 and 2");
    }
    const maxTokens = Number(params.max_tokens ?? 1024);
    if (maxTokens < 1 || maxTokens > 8192) {
      issues.push("max_tokens must be between 1 and 8192");
    }
    if (modelId.includes("structured-extract")) {
      try {
        const schema = JSON.parse(String(params.json_schema ?? ""));
        if (
          typeof schema !== "object" ||
          schema === null ||
          schema.type !== "object" ||
          typeof schema.properties !== "object" ||
          schema.properties === null
        ) {
          issues.push("JSON Schema must define an object with properties");
        }
      } catch {
        issues.push("JSON Schema must be valid JSON");
      }
    }
  }

  const confidence = params.confidence_threshold;
  if (confidence !== undefined) {
    const v = Number(confidence);
    if (v < 0 || v > 1) issues.push("confidence_threshold must be between 0 and 1");
  }

  return issues;
}

function upstreamWillAutoRun(
  upstream: UpstreamContext,
  options?: NodeReadinessOptions,
): boolean {
  return Boolean(
    options?.deferUpstreamOutput &&
      upstream.nodeId &&
      options.chainNodeIds?.has(upstream.nodeId),
  );
}

export function getNodeReadiness(
  modelId: string,
  data: PipelineNodeData,
  upstream: UpstreamContext,
  _projectId: string,
  options?: NodeReadinessOptions,
): NodeReadiness {
  const issues: string[] = [...validateNodeParams(modelId, data.params)];
  const { input: requiredInput } = getNodeWireKinds(data);

  if (isCustomPipelineModelId(modelId)) {
    if (requiredInput === "none") {
      issues.push("Pipeline input/output is not configured");
    } else if (
      !upstreamSatisfiesInput(requiredInput, upstream.output) &&
      !upstreamWillAutoRun(upstream, options)
    ) {
      if (!upstream.nodeId) {
        issues.push("Connect a compatible upstream node");
      } else {
        issues.push("Run or connect compatible upstream output");
      }
    }
    return { ready: issues.length === 0, issues };
  }

  if (SOURCE_NODE_MODELS.has(modelId)) {
    if (!paramsAssetId(data)) {
      issues.push("Upload a file first");
    }
    return { ready: issues.length === 0, issues };
  }

  if (modelId === "loader/page-at") {
    const upstreamPages = extractPages(upstream.output);
    if (upstreamPages.length === 0) {
      if (!upstream.nodeId) {
        issues.push("Connect a from page loader");
      } else if (!upstreamWillAutoRun(upstream, options)) {
        issues.push("Connect and run a from page loader");
      }
    } else {
      const idx = Number(data.params.page_index ?? 0);
      if (idx >= upstreamPages.length) {
        issues.push(`Page number out of range (1–${upstreamPages.length})`);
      }
    }
    return { ready: issues.length === 0, issues };
  }

  if (modelId === "loader/page-branch") {
    const upstreamPages = extractPages(upstream.output);
    if (upstreamPages.length === 0) {
      if (!upstream.nodeId) {
        issues.push("Connect to Select Page");
      } else if (!upstreamWillAutoRun(upstream, options)) {
        issues.push("Connect and run upstream Select Page");
      }
    } else {
      const idx = Number(data.params.page_index ?? 0);
      if (idx >= upstreamPages.length) {
        issues.push(`Page number out of range (1–${upstreamPages.length})`);
      }
    }
    return { ready: issues.length === 0, issues };
  }

  if (
    modelId === "docling/vlm-granite-docling" ||
    modelId === "docling/convert-pipeline"
  ) {
    if (!paramsAssetId(data) && !upstream.assetId) {
      issues.push("Upload a document or connect a file loader");
    }
    return { ready: issues.length === 0, issues };
  }

  if (
    (modelId === "ollama/text-prompt" ||
      modelId === "ollama/structured-extract") &&
    typeof data.params.text === "string" &&
    data.params.text.trim()
  ) {
    return { ready: issues.length === 0, issues };
  }

  if (requiredInput !== "file" && requiredInput !== "document_input") {
    const hasDirectDocument =
      nodeAcceptsDirectDocument(modelId, requiredInput) && paramsAssetId(data);
    if (!upstream.nodeId) {
      if (!hasDirectDocument) {
        issues.push(
          nodeAcceptsDirectDocument(modelId, requiredInput)
            ? "Upload a test document or connect an upstream node"
            : "Connect an upstream node",
        );
      }
    } else if (!upstream.output) {
      if (!upstreamWillAutoRun(upstream, options) && !hasDirectDocument) {
        issues.push("Run the upstream node first");
      }
    } else if (!upstreamSatisfiesInput(requiredInput, upstream.output)) {
      issues.push("From node output does not match required input");
    }
  }

  const page = extractPageImage(upstream.output);
  if (
    requiredInput === "page_artifact" ||
    requiredInput === "page_artifact_regions"
  ) {
    if (upstream.output && !page) {
      issues.push("From node has no page image");
    }
  }

  if (requiredInput === "page_artifact_regions") {
    const regions = extractRegions(upstream.output);
    if (
      REGION_REQUIRED_MODELS.has(modelId) &&
      upstream.output &&
      regions.length === 0
    ) {
      issues.push("Run from layout detection first");
    }
  }

  if (requiredInput === "text_line_array" && modelId === "surya/text-recognition") {
    const lines = extractLines(upstream.output);
    if (upstream.output && lines.length === 0) {
      issues.push("Run from text detection first");
    }
  }

  if (requiredInput === "figure_array") {
    const figures =
      upstream.output?.kind === "figures"
        ? ((upstream.output.raw as { figures?: unknown[] }).figures ?? [])
        : [];
    if (upstream.output && figures.length === 0) {
      issues.push("Connect a figure or picture region from the upstream node");
    }
  }

  if (requiredInput === "table_structure_array" && modelId === "docling/tableformer-accurate") {
    const tables =
      upstream.output?.kind === "tables"
        ? ((upstream.output.raw as { tables?: unknown[] }).tables ?? [])
        : [];
    const regions = extractRegions(upstream.output);
    if (upstream.output && tables.length === 0 && regions.length === 0) {
      issues.push("Connect a table region from from layout detection");
    }
  }

  return { ready: issues.length === 0, issues };
}

export function getNodeTestRunReadiness(
  nodeId: string,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  projectId: string,
): NodeReadiness {
  const node = nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    return { ready: false, issues: ["Node not found"] };
  }

  const chain = [...collectUpstreamChain(nodeId, nodes, edges), nodeId];
  const chainNodeIds = new Set(chain);

  for (const id of chain) {
    const entry = nodes.find((candidate) => candidate.id === id);
    if (!entry) continue;

    const requiredInput = getNodeWireKinds(entry.data).input;
    const upstream = getUpstreamContext(id, nodes, edges, requiredInput);
    const readiness = getNodeReadiness(
      entry.data.modelId,
      entry.data,
      upstream,
      projectId,
      { deferUpstreamOutput: true, chainNodeIds },
    );

    if (!readiness.ready) {
      return readiness;
    }
  }

  return { ready: true, issues: [] };
}

function paramsAssetId(data: PipelineNodeData): boolean {
  return Boolean(data.params.assetId);
}

const REGION_REQUIRED_MODELS = new Set([
  "surya/reading-order",
  "docling/tableformer-accurate",
  "docling/code-formula-v2",
  "surya/latex-ocr",
]);

/** Page-input models can be tested from an attached document instead of a loader. */
export function nodeAcceptsDirectDocument(
  modelId: string,
  requiredInput: WireKind,
): boolean {
  if (SOURCE_NODE_MODELS.has(modelId) || isCustomPipelineModelId(modelId)) {
    return false;
  }
  if (requiredInput === "page_artifact") return true;
  if (requiredInput === "page_artifact_regions") {
    return !REGION_REQUIRED_MODELS.has(modelId);
  }
  return false;
}

export function getUpstreamPagesForNode(
  data: PipelineNodeData,
  upstream: UpstreamContext,
): PageArtifactWire[] {
  if (data.cachedOutput?.kind === "pages") {
    return extractPages(data.cachedOutput);
  }
  if (data.modelId === "loader/page-at") {
    return extractPages(upstream.output);
  }
  if (data.modelId === "loader/page-branch") {
    if (upstream.rawOutput?.kind === "pages") {
      return extractPages(upstream.rawOutput);
    }
    return extractPages(upstream.output);
  }
  if (data.cachedOutput?.kind === "page") {
    return extractPages(data.cachedOutput);
  }
  return [];
}
