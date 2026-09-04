"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { DetailSection } from "@/components/canvas/node-detail/detail-section";
import { ParamField } from "@/components/canvas/node-detail/param-field";
import { ConnectionSelectField } from "@/components/canvas/node-detail/connection-select-field";
import { PageIndexPicker } from "@/components/canvas/page-index-picker";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { uploadPipelineAsset, uploadProjectAsset } from "@/lib/api/assets";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { getParamSchema, resolveParamValue } from "@/lib/canvas/node-param-schema";
import {
  getUpstreamPagesForNode,
  nodeAcceptsDirectDocument,
  validateNodeParams,
} from "@/lib/canvas/node-readiness";
import { getNodeWireKinds } from "@/lib/canvas/wire-types";
import {
  isPageSelectorNode,
  PARENT_SELECT_PAGE_PARAM,
} from "@/lib/canvas/page-branch-meta";
import {
  isLayoutSelectorNode,
  PARENT_LAYOUT_NODE_PARAM,
} from "@/lib/canvas/region-branch-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import { isConnectedModel, isConnectedVisionModel } from "@/lib/canvas/connected-node-meta";

type NodeDetailSetupTabProps = {
  nodeId: string;
  data: PipelineNodeData;
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function NodeDetailSetupTab({ nodeId, data }: NodeDetailSetupTabProps) {
  const { projectId, entity, updateNodeConfig, updateNodeData, getUpstream, runNode } =
    usePipelineGraphActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const schema = getParamSchema(data.modelId, data.category);
  const paramErrors = validateNodeParams(data.modelId, data.params);
  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const needsDocument =
    data.modelId === "docling/vlm-granite-docling" ||
    data.modelId === "docling/convert-pipeline" ||
    nodeAcceptsDirectDocument(data.modelId, getNodeWireKinds(data).input);
  const upstream = getUpstream(nodeId);
  const upstreamPages = getUpstreamPagesForNode(data, upstream);
  const assetFilename = data.params.assetFilename as string | undefined;

  const isPageSelector = isPageSelectorNode(data.modelId);
  const isLayoutSelector = isLayoutSelectorNode(data.modelId, data.category);
  const editableFields = schema.filter((f) => !f.readOnly);
  const editableKeys = new Set(editableFields.map((f) => f.key));
  const readOnlyEntries = Object.entries(data.params).filter(
    ([key]) =>
      !editableKeys.has(key) &&
      !key.startsWith("asset") &&
      key !== "format" &&
      key !== PARENT_SELECT_PAGE_PARAM &&
      key !== PARENT_LAYOUT_NODE_PARAM,
  );

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
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
        if (isSourceLoader) {
          updateNodeData(nodeId, {
            cachedOutput: null,
            runStatus: "idle",
            runResult: undefined,
          });
        }

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
        if (autoRun && (isSourceLoader || needsDocument)) {
          void runNode(nodeId);
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [
      isSourceLoader,
      needsDocument,
      entity,
      nodeId,
      projectId,
      runNode,
      updateNodeConfig,
      updateNodeData,
    ],
  );

  const clearAsset = () => {
    updateNodeConfig(nodeId, {
      assetId: "",
      assetFilename: "",
      format: "",
    });
    if (isSourceLoader) {
      updateNodeData(nodeId, {
        cachedOutput: null,
        runStatus: "idle",
        runResult: undefined,
      });
    }
  };

  return (
    <div className="px-4 py-3">
      {(isSourceLoader || needsDocument) && (
        <DetailSection
          title={isSourceLoader ? "Document source" : "Test document"}
          className="border-b-0 px-0 py-0"
        >
          <div className="space-y-2">
            {assetFilename ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {assetFilename}
                </span>
                <button
                  type="button"
                  onClick={clearAsset}
                  className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none"
                  aria-label="Remove file"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : null}

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
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-4 text-center transition-colors",
                "hover:border-[var(--pulse)]/45 hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-4 text-muted-foreground" />
              )}
              <p className="text-[11px] text-muted-foreground">
                {assetFilename ? "Replace file" : "Drop PDF or image"}
              </p>
              <p className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                PDF, PNG, JPEG, WebP
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
              <p className="text-[10px] text-destructive">{uploadError}</p>
            )}
          </div>
        </DetailSection>
      )}

      {isPageSelector && (
        <DetailSection title="Configuration" className="px-0">
          <PageIndexPicker
            pageCount={upstreamPages.length}
            value={Number(data.params.page_index ?? 0)}
            onChange={(index) => updateNodeConfig(nodeId, { page_index: index })}
          />
        </DetailSection>
      )}

      {editableFields.length > 0 && (
        <DetailSection
          title="Configuration"
          collapsible={isSourceLoader}
          defaultOpen={!isSourceLoader}
          className={cn(
            "px-0",
            (isSourceLoader || needsDocument) && "mt-4 border-t border-border pt-4",
          )}
        >
          <div className="space-y-3">
            {editableFields.map((field) => (
              field.key === "connection_id" && isConnectedModel(data.modelId) ? (
                <ConnectionSelectField
                  key={field.key}
                  modelId={data.modelId}
                  value={resolveParamValue(data.modelId, data.params, field)}
                  onChange={(connection) => updateNodeConfig(nodeId, {
                    connection_id: connection?.id ?? "",
                    model: (isConnectedVisionModel(data.modelId)
                      ? connection?.vision_model
                      : connection?.text_model) ?? "",
                  })}
                />
              ) : (
                <ParamField
                  key={field.key}
                  field={field}
                  value={resolveParamValue(data.modelId, data.params, field)}
                  maxOverride={
                    field.key === "page_index"
                      ? Math.max(1, upstreamPages.length)
                      : undefined
                  }
                  onChange={(val) => updateNodeConfig(nodeId, { [field.key]: val })}
                />
              )
            ))}
          </div>
          {paramErrors.length > 0 && (
            <p className="mt-3 text-[10px] text-destructive">
              {paramErrors.join("; ")}
            </p>
          )}
        </DetailSection>
      )}

      {readOnlyEntries.length > 0 && !isSourceLoader && (
        <DetailSection
          title="Model details"
          collapsible
          defaultOpen={false}
          className="mt-4 px-0"
        >
          <div className="space-y-1.5">
            {readOnlyEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{key}</span>
                <span className="shrink-0 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {typeof value === "boolean"
                    ? value
                      ? "true"
                      : "false"
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </div>
  );
}
