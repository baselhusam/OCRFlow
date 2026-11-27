"use client";

import { useCallback, useState } from "react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { uploadPipelineAsset, uploadProjectAsset } from "@/lib/api/assets";
import { getLoaderAccept } from "@/lib/canvas/loader-accept";
import type { PipelineNodeData } from "@/lib/canvas/types";

/**
 * Upload a document into a loader node and immediately load its pages.
 *
 * Loading pages is cheap (the gateway rasterises the file), so there is no
 * separate "Load" step any more: choose a file and the node turns green with a
 * page count.
 */
export function useDocumentUpload(nodeId: string, data: PipelineNodeData) {
  const { entity, projectId, updateNodeConfig, updateNodeData, runNode } =
    usePipelineGraphActions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = getLoaderAccept(data.modelId);

  const upload = useCallback(
    async (file: File) => {
      const rejection = accept.reject(file);
      if (rejection) {
        setError(rejection);
        return false;
      }
      setUploading(true);
      setError(null);
      try {
        const result =
          entity?.kind === "pipeline"
            ? await uploadPipelineAsset(entity.id, file)
            : await uploadProjectAsset(projectId, file);
        updateNodeConfig(nodeId, {
          assetId: result.asset_id,
          assetFilename: result.filename,
          format: result.format,
        });
        updateNodeData(nodeId, {
          cachedOutput: null,
          runStatus: "idle",
          runResult: undefined,
        });
        // Let the config update land before the run reads node state.
        window.setTimeout(() => void runNode(nodeId), 60);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        return false;
      } finally {
        setUploading(false);
      }
    },
    [accept, entity, nodeId, projectId, runNode, updateNodeConfig, updateNodeData],
  );

  return { upload, uploading, error, clearError: () => setError(null), accept };
}
