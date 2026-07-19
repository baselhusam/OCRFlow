"use client";

import { useCallback } from "react";

import { useCanvasToast } from "@/components/canvas/canvas-toast-context";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  getSourceLoaderAlreadyLoadedMessage,
  getSourceLoaderLoadLabel,
  isSourceDocumentLoaded,
} from "@/lib/canvas/source-loader-utils";
import type { PipelineNodeData } from "@/lib/canvas/types";

export function useSourceLoaderLoad(nodeId: string, data: PipelineNodeData) {
  const { runNode } = usePipelineGraphActions();
  const { showCanvasToast } = useCanvasToast();

  const isRunning = data.runStatus === "running";
  const isLoaded = isSourceDocumentLoaded(data);
  const hasAsset = Boolean(data.params.assetId);
  const loadLabel = getSourceLoaderLoadLabel(data, isRunning);
  const canLoadDocument = hasAsset && !isRunning;

  const handleLoadClick = useCallback(() => {
    if (isRunning) return;

    if (isLoaded) {
      showCanvasToast({
        title: "Already loaded",
        message: getSourceLoaderAlreadyLoadedMessage(data),
        variant: "success",
      });
      return;
    }

    void runNode(nodeId);
  }, [data, isLoaded, isRunning, nodeId, runNode, showCanvasToast]);

  return {
    handleLoadClick,
    isRunning,
    isLoaded,
    loadLabel,
    canLoadDocument,
  };
}
