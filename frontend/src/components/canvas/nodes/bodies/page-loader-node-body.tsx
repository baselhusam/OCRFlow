"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { PageIndexPicker } from "@/components/canvas/page-index-picker";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { uploadProjectAsset } from "@/lib/api/assets";
import { getUpstreamPagesForNode } from "@/lib/canvas/node-readiness";
import { isPageAtAnchor } from "@/lib/canvas/page-branch-meta";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { getLoaderAccept } from "@/lib/canvas/loader-accept";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type PageLoaderNodeBodyProps = {
  nodeId: string;
  data: PipelineNodeData;
};

export function PageLoaderNodeBody({ nodeId, data }: PageLoaderNodeBodyProps) {
  const { projectId, updateNodeConfig, updateNodeData, getUpstream, runNode } =
    usePipelineGraphActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const assetFilename = data.params.assetFilename as string | undefined;
  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const isPageAt = isPageAtAnchor(data.modelId);
  const upstream = getUpstream(nodeId);
  const upstreamPages = getUpstreamPagesForNode(data, upstream);
  const selectedPageIndex = Number(data.params.page_index ?? 0);

  const loaderAccept = getLoaderAccept(data.modelId);

  const handleFile = useCallback(
    async (file: File) => {
      const rejection = loaderAccept.reject(file);
      if (rejection) {
        setUploadError(rejection);
        return;
      }
      setUploading(true);
      setUploadError(null);
      try {
        const result = await uploadProjectAsset(projectId, file);
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

        let autoRun = false;
        try {
          const meRes = await fetch("/api/auth/me", { credentials: "include" });
          if (meRes.ok) {
            const me = (await meRes.json()) as {
              preferences?: { auto_run_on_upload?: boolean };
            };
            autoRun = Boolean(me.preferences?.auto_run_on_upload);
          }
        } catch {
          // Preference lookup is best-effort; upload already succeeded.
        }
        if (autoRun) {
          void runNode(nodeId);
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [loaderAccept, nodeId, projectId, runNode, updateNodeConfig, updateNodeData],
  );

  return (
    <div className="flex flex-col gap-2">
      {isSourceLoader && (
        <>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className={cn(
              "ocrflow-upload-dropzone flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-center transition-colors hover:bg-muted/40 hover:border-border",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="size-4 text-muted-foreground" />
            )}
            <p className="text-[10px] text-muted-foreground">
              {assetFilename ? (
                <>
                  <span className="font-medium text-foreground/90">{assetFilename}</span>
                  <span className="block text-[9px] opacity-70">Click to replace</span>
                </>
              ) : (
                loaderAccept.prompt
              )}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={loaderAccept.accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {uploadError && (
            <p className="px-1 text-[9px] text-destructive">{uploadError}</p>
          )}
        </>
      )}

      {isPageAt && upstreamPages.length > 0 && (
        <PageIndexPicker
          pageCount={upstreamPages.length}
          value={selectedPageIndex}
          onChange={(index) => updateNodeConfig(nodeId, { page_index: index })}
          variant="compact"
        />
      )}
    </div>
  );
}
