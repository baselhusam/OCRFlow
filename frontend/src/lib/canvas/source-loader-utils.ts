import { extractPages } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";

export function isSourceDocumentLoaded(data: PipelineNodeData): boolean {
  return Boolean(data.cachedOutput);
}

export function getLoadedPageCount(data: PipelineNodeData): number | null {
  const output = data.cachedOutput;
  if (!output) return null;
  if (output.preview?.pageCount !== undefined) {
    return output.preview.pageCount;
  }
  if (output.kind === "pages") {
    return extractPages(output).length;
  }
  return null;
}

export function getSourceLoaderLoadLabel(
  data: PipelineNodeData,
  isRunning: boolean,
): string {
  if (isRunning) return "Loading document…";
  if (!isSourceDocumentLoaded(data)) return "Load";

  const pageCount = getLoadedPageCount(data);
  if (pageCount !== null) {
    return `Loaded · ${pageCount} ${pageCount === 1 ? "page" : "pages"}`;
  }
  return "Loaded";
}

export function getSourceLoaderAlreadyLoadedMessage(
  data: PipelineNodeData,
): string {
  const pageCount = getLoadedPageCount(data);
  if (pageCount !== null) {
    return `This document is already loaded (${pageCount} ${pageCount === 1 ? "page" : "pages"}).`;
  }
  return "This document is already loaded.";
}
