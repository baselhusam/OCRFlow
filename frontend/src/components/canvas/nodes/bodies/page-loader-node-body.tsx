"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Eye, FileInput, Loader2, Upload } from "lucide-react";

import { AssetPreviewDialog } from "@/components/canvas/asset-preview-dialog";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import { PageIndexPicker } from "@/components/canvas/page-index-picker";
import { PagePreviewDialog } from "@/components/canvas/page-preview-dialog";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { Button } from "@/components/ui/button";
import { uploadProjectAsset } from "@/lib/api/assets";
import { useSourceLoaderLoad } from "@/hooks/use-source-loader-load";
import { getUpstreamPagesForNode } from "@/lib/canvas/node-readiness";
import { isPageAtAnchor } from "@/lib/canvas/page-branch-meta";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type PageLoaderNodeBodyProps = {
  nodeId: string;
  data: PipelineNodeData;
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function PageLoaderNodeBody({ nodeId, data }: PageLoaderNodeBodyProps) {
  const { projectId, updateNodeConfig, updateNodeData, getUpstream, runNode } =
    usePipelineGraphActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const assetId = data.params.assetId as string | undefined;
  const assetFilename = data.params.assetFilename as string | undefined;
  const assetFormat = data.params.format as string | undefined;
  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const isPageAt = isPageAtAnchor(data.modelId);
  const upstream = getUpstream(nodeId);
  const upstreamPages = getUpstreamPagesForNode(data, upstream);
  const selectedPageIndex = Number(data.params.page_index ?? 0);
  const selectedPage =
    upstreamPages.find((page) => page.page_index === selectedPageIndex) ??
    upstreamPages[0];
  const canPreviewSelectedPage = Boolean(selectedPage?.page?.image_base64);
  const {
    handleLoadClick,
    isRunning,
    isLoaded,
    loadLabel,
    canLoadDocument,
  } = useSourceLoaderLoad(nodeId, data);

  const handleFile = useCallback(
    async (file: File) => {
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
    [nodeId, projectId, runNode, updateNodeConfig, updateNodeData],
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
                "Drop PDF or image"
              )}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {uploadError && (
            <p className="text-[9px] text-destructive px-1">{uploadError}</p>
          )}

          {data.runResult?.error && (
            <NodeErrorPanel
              compact
              error={data.runResult.error}
              errorCode={data.runResult.errorCode}
              errorContext={data.runResult.errorContext}
              nodeLabel={data.label}
              className="mx-1"
            />
          )}

          {assetId && (
            <>
              <Button
                type="button"
                size="sm"
                disabled={!canLoadDocument}
                className={cn(
                  "nodrag nopan h-8 w-full rounded-md text-[11px] font-semibold",
                  !canLoadDocument && "bg-secondary text-muted-foreground",
                  canLoadDocument &&
                    isLoaded &&
                    "cursor-default border border-[var(--status-ok)]/45 bg-[var(--status-ok)]/12 text-[var(--status-ok)] hover:bg-[var(--status-ok)]/12",
                  canLoadDocument &&
                    !isLoaded &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  handleLoadClick();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {isRunning ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : isLoaded ? (
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                ) : (
                  <FileInput className="mr-1.5 size-3.5" />
                )}
                {loadLabel}
              </Button>

              <Button
                type="button"
                size="sm"
                className={cn(
                  "nodrag nopan h-8 w-full rounded-md text-[11px] font-semibold",
                  "border-primary/35 bg-primary/10 text-primary",
                  "hover:border-primary/50 hover:bg-primary/15",
                )}
                aria-label="Preview uploaded file"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="mr-1.5 size-3.5 shrink-0" strokeWidth={2} />
                Preview
              </Button>

              <AssetPreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                projectId={projectId}
                assetId={assetId}
                format={assetFormat}
                filename={assetFilename}
              />
            </>
          )}
        </>
      )}

      {isPageAt && upstreamPages.length > 0 && (
        <>
          <PageIndexPicker
            pageCount={upstreamPages.length}
            value={selectedPageIndex}
            onChange={(index) => updateNodeConfig(nodeId, { page_index: index })}
            variant="compact"
          />

          <button
            type="button"
            disabled={!canPreviewSelectedPage}
            className={cn(
              "nodrag nopan flex h-8 w-full items-center justify-center gap-1.5 rounded-md border text-[11px] font-semibold transition-colors",
              "border-primary/35 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15",
              !canPreviewSelectedPage && "opacity-50",
            )}
            onClick={(event) => {
              event.stopPropagation();
              setPreviewOpen(true);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Eye className="size-3.5 shrink-0" strokeWidth={2} />
            Preview
            <span className="font-mono text-[10px] font-normal opacity-80">
              · p.{selectedPageIndex + 1}
            </span>
          </button>

          {selectedPage && (
            <PagePreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              pages={[selectedPage]}
              pageIndex={selectedPage.page_index}
            />
          )}
        </>
      )}
    </div>
  );
}
