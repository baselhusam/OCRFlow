import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { getNodeReadiness } from "@/lib/canvas/node-readiness";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";
import {
  getRequiredInputKind,
  upstreamSatisfiesInput,
} from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";

export type NodeDetailTab = "setup" | "connections" | "preview";

export function getDefaultNodeDetailTab(): NodeDetailTab {
  return "setup";
}

export function getPreviewSubTab(
  data: PipelineNodeData,
): "input" | "output" {
  return data.cachedOutput || data.runResult?.previewBase64 ? "output" : "input";
}

export type NodeDetailTabBadges = {
  setupIssues: number;
  connectionsWarning: boolean;
  previewDot: "success" | "error" | null;
};

export function getNodeDetailTabBadges(
  data: PipelineNodeData,
  upstream: UpstreamContext,
  projectId: string,
): NodeDetailTabBadges {
  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const readiness = getNodeReadiness(data.modelId, data, upstream, projectId);
  const requiredInput = getRequiredInputKind(data.modelId, data.inputType);
  const inputOk =
    requiredInput === "file" ||
    requiredInput === "document_input" ||
    upstreamSatisfiesInput(requiredInput, upstream.output);

  let previewDot: "success" | "error" | null = null;
  if (data.runStatus === "error") {
    previewDot = "error";
  } else if (
    data.cachedOutput ||
    data.runResult?.previewBase64 ||
    (isSourceLoader && data.params.assetId)
  ) {
    previewDot = "success";
  }

  return {
    setupIssues: isSourceLoader ? 0 : readiness.ready ? 0 : readiness.issues.length,
    connectionsWarning: Boolean(upstream.nodeId && !inputOk),
    previewDot,
  };
}
