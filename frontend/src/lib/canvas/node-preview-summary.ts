import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { formatArtifactKind } from "@/lib/canvas/wire-labels";
import {
  extractLines,
  extractPages,
  extractRegions,
  type UpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";

export function summarizeInput(
  data: PipelineNodeData,
  upstream: UpstreamContext,
): string | null {
  if (SOURCE_NODE_MODELS.has(data.modelId)) {
    const filename = data.params.assetFilename as string | undefined;
    return filename ? filename : null;
  }

  if (
    data.modelId === "docling/vlm-granite-docling" ||
    data.modelId === "docling/convert-pipeline"
  ) {
    const filename = data.params.assetFilename as string | undefined;
    return filename ? filename : null;
  }

  if (!upstream.output) return null;

  const output = upstream.output;
  if (output.kind === "pages") {
    const count = extractPages(output).length;
    return `${count} page${count === 1 ? "" : "s"}`;
  }
  if (output.kind === "page") return "1 page";
  if (output.kind === "regions") {
    const count = extractRegions(output).length;
    return `${count} region${count === 1 ? "" : "s"}`;
  }
  if (output.kind === "lines") {
    const count = extractLines(output).length;
    return `${count} line${count === 1 ? "" : "s"}`;
  }
  if (output.kind === "document") {
    return `${output.preview?.itemCount ?? 0} pages`;
  }
  if (output.preview?.itemCount !== undefined) {
    return `${output.preview.itemCount} items`;
  }
  return formatArtifactKind(output.kind);
}

export function summarizeOutput(data: PipelineNodeData): string | null {
  const output = data.cachedOutput;
  if (!output) {
    if (data.runResult?.previewBase64) return "Preview";
    return null;
  }
  if (output.preview?.pageCount !== undefined) {
    return `${output.preview.pageCount} page${output.preview.pageCount === 1 ? "" : "s"}`;
  }
  if (output.preview?.itemCount !== undefined) {
    return `${output.preview.itemCount} item${output.preview.itemCount === 1 ? "" : "s"}`;
  }
  return formatArtifactKind(output.kind);
}

export function getInlinePreviewLabel(
  data: PipelineNodeData,
  upstream: UpstreamContext,
): string | null {
  return summarizeOutput(data) ?? summarizeInput(data, upstream);
}
