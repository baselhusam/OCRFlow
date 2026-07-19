import type {
  NodeCachedOutput,
  OutputPreview,
  PipelineNodeRuntime,
} from "@/lib/canvas/types";

function stripPreviewBinary(preview: OutputPreview | undefined): OutputPreview | undefined {
  if (!preview) return preview;
  const next: OutputPreview = { ...preview };
  delete next.thumbnailBase64;
  if (next.pageImage) {
    const { image_base64: _removed, ...pageImage } = next.pageImage;
    next.pageImage = pageImage;
  }
  return next;
}

/** Remove large binary blobs before persisting graph to the server. */
export function stripRuntimeForPersist(
  runtime: PipelineNodeRuntime | undefined,
): PipelineNodeRuntime | undefined {
  if (!runtime) return undefined;

  const cachedOutput = runtime.cachedOutput
    ? ({
        ...runtime.cachedOutput,
        preview: stripPreviewBinary(runtime.cachedOutput.preview),
      } as NodeCachedOutput)
    : runtime.cachedOutput;

  const runResult = runtime.runResult
    ? {
        pageCount: runtime.runResult.pageCount,
        error: runtime.runResult.error,
        errorCode: runtime.runResult.errorCode,
        errorContext: runtime.runResult.errorContext,
      }
    : undefined;

  const hasRuntime =
    runtime.runStatus ||
    runtime.lastRunAt ||
    runResult ||
    runtime.outputPanelOpen !== undefined ||
    runtime.pageBranchNodeId ||
    runtime.regionBranchNodeId ||
    runtime.captionBranchNodeId ||
    runtime.documentBranchNodeId ||
    runtime.branchPanelWidth !== undefined ||
    runtime.branchPanelHeight !== undefined ||
    runtime.captionMarkdownPreview !== undefined ||
    cachedOutput;

  if (!hasRuntime) return undefined;

  return {
    runStatus: runtime.runStatus,
    lastRunAt: runtime.lastRunAt,
    runResult,
    outputPanelOpen: runtime.outputPanelOpen,
    pageBranchNodeId: runtime.pageBranchNodeId,
    regionBranchNodeId: runtime.regionBranchNodeId,
    captionBranchNodeId: runtime.captionBranchNodeId,
    documentBranchNodeId: runtime.documentBranchNodeId,
    branchPanelWidth: runtime.branchPanelWidth,
    branchPanelHeight: runtime.branchPanelHeight,
    captionMarkdownPreview: runtime.captionMarkdownPreview,
    cachedOutput: cachedOutput ?? null,
  };
}

export function runtimeFromNodeData(data: {
  runStatus?: PipelineNodeRuntime["runStatus"];
  lastRunAt?: string;
  runResult?: PipelineNodeRuntime["runResult"];
  outputPanelOpen?: boolean;
  pageBranchNodeId?: string;
  regionBranchNodeId?: string;
  captionBranchNodeId?: string;
  documentBranchNodeId?: string;
  branchPanelWidth?: number;
  branchPanelHeight?: number;
  captionMarkdownPreview?: boolean;
  cachedOutput?: NodeCachedOutput | null;
}): PipelineNodeRuntime | undefined {
  return stripRuntimeForPersist({
    runStatus: data.runStatus,
    lastRunAt: data.lastRunAt,
    runResult: data.runResult
      ? {
          pageCount: data.runResult.pageCount,
          error: data.runResult.error,
          errorCode: data.runResult.errorCode,
          errorContext: data.runResult.errorContext,
        }
      : undefined,
    outputPanelOpen: data.outputPanelOpen,
    pageBranchNodeId: data.pageBranchNodeId,
    regionBranchNodeId: data.regionBranchNodeId,
    captionBranchNodeId: data.captionBranchNodeId,
    documentBranchNodeId: data.documentBranchNodeId,
    branchPanelWidth: data.branchPanelWidth,
    branchPanelHeight: data.branchPanelHeight,
    captionMarkdownPreview: data.captionMarkdownPreview,
    cachedOutput: data.cachedOutput,
  });
}
