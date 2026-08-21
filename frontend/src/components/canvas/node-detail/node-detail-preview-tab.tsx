"use client";

import { useState } from "react";

import { AssetPreview } from "@/components/canvas/asset-preview";
import { PageAtPreviewTab } from "@/components/canvas/node-detail/page-at-preview-tab";
import { LayoutPreviewTab } from "@/components/canvas/node-detail/layout-preview-tab";
import { CategoryPreview } from "@/components/canvas/node-detail/previews/category-preview";
import { FilePreview } from "@/components/canvas/node-detail/previews/document-preview";
import { JsonTree } from "@/components/canvas/node-detail/previews/json-tree";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  canvasInspectorSubTabTriggerClassName,
  canvasInspectorSubTabsListClassName,
  canvasInspectorSubTabsShellClassName,
} from "@/lib/canvas/canvas-chrome";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { getUpstreamPagesForNode } from "@/lib/canvas/node-readiness";
import {
  isPageSelectorNode,
} from "@/lib/canvas/page-branch-meta";
import { isLayoutSelectorNode } from "@/lib/canvas/region-branch-meta";
import {
  summarizeInput,
  summarizeOutput,
} from "@/lib/canvas/node-preview-summary";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import { extractPageImage, extractPages } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";

type NodeDetailPreviewTabProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
  defaultSubTab?: "input" | "output";
};

function SourceLoaderPreview({
  nodeId,
  data,
}: {
  nodeId: string;
  data: PipelineNodeData;
}) {
  const { projectId, updateNodeConfig } = usePipelineGraphActions();
  const assetId = data.params.assetId as string | undefined;
  const assetFilename = data.params.assetFilename as string | undefined;
  const assetFormat = data.params.format as string | undefined;
  const output = data.cachedOutput;
  const pages = output ? extractPages(output) : [];
  const outputPageImage =
    extractPageImage(output ?? null)?.image_base64 ??
    output?.preview?.pageImage?.image_base64 ??
    output?.preview?.thumbnailBase64;

  if (output) {
    return (
      <CategoryPreview
        category={data.category}
        output={output}
        pages={pages}
        pageImageBase64={outputPageImage}
        selectedPageIndex={Number(data.params.page_index ?? 0)}
        onSelectPage={(index) => updateNodeConfig(nodeId, { page_index: index })}
      />
    );
  }

  if (assetId) {
    return (
      <AssetPreview
        projectId={projectId}
        assetId={assetId}
        format={assetFormat}
        filename={assetFilename}
        maxHeight={480}
      />
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Upload a document in Setup to preview it here.
    </p>
  );
}

export function NodeDetailPreviewTab({
  nodeId,
  data,
  upstream,
  defaultSubTab = "input",
}: NodeDetailPreviewTabProps) {
  const { projectId, updateNodeConfig } = usePipelineGraphActions();
  const [subTab, setSubTab] = useState<"input" | "output">(defaultSubTab);

  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const isPageSelector = isPageSelectorNode(data.modelId);
  const isLayoutSelector = isLayoutSelectorNode(data.modelId, data.category);
  const showRawJson = !isPageSelector && !isLayoutSelector;
  const pages = getUpstreamPagesForNode(data, upstream);
  const planned = isPlannedNode(data.modelId, data.category);
  const output = data.cachedOutput;
  const inputSummary = summarizeInput(data, upstream);
  const outputSummary = summarizeOutput(data);
  const pageImage = extractPageImage(upstream.output ?? null)?.image_base64;
  const outputPageImage =
    extractPageImage(output ?? null)?.image_base64 ??
    output?.preview?.pageImage?.image_base64 ??
    output?.preview?.thumbnailBase64;

  const needsUpload =
    data.modelId === "docling/vlm-granite-docling" ||
    data.modelId === "docling/convert-pipeline";

  if (isSourceLoader) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[18px] py-3">
        <SourceLoaderPreview nodeId={nodeId} data={data} />
      </div>
    );
  }

  if (isPageSelector) {
    return (
      <PageAtPreviewTab nodeId={nodeId} data={data} upstream={upstream} />
    );
  }

  if (isLayoutSelector) {
    return (
      <LayoutPreviewTab data={data} upstream={upstream} />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as "input" | "output")}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className={canvasInspectorSubTabsShellClassName}>
          <TabsList className={canvasInspectorSubTabsListClassName}>
            <TabsTrigger
              value="input"
              className={canvasInspectorSubTabTriggerClassName}
            >
              Input
              {inputSummary && (
                <span className="truncate font-mono text-[9px] font-normal text-muted-foreground">
                  · {inputSummary}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="output"
              className={canvasInspectorSubTabTriggerClassName}
            >
              Output
              {outputSummary && (
                <span className="truncate font-mono text-[9px] font-normal text-muted-foreground">
                  · {outputSummary}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="input" className="min-h-0 flex-1 overflow-y-auto px-[18px] py-3">
          {data.category === "export" ? (
            <p className="text-xs text-muted-foreground">
              Expects DocumentArtifact from upstream assembler or VLM node.
            </p>
          ) : !upstream.output && !pages.length ? (
            <p className="text-xs text-muted-foreground">
              {needsUpload && !data.params.assetId
                ? "Upload a document in Setup to provide input."
                : "Connect and run an upstream node, or check Connections."}
            </p>
          ) : (
            <>
              <CategoryPreview
                category={data.category}
                output={upstream.output}
                pages={pages}
                pageImageBase64={pageImage}
                selectedPageIndex={Number(data.params.page_index ?? 0)}
                onSelectPage={(index) =>
                  updateNodeConfig(nodeId, { page_index: index })
                }
                isInput
              />
              {showRawJson && upstream.output && (
                <div className="mt-3">
                  <JsonTree data={upstream.output.raw} />
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="output" className="min-h-0 flex-1 overflow-y-auto px-[18px] py-3">
          {planned && !output && (
            <p className="text-xs text-muted-foreground">
              Output preview will appear once this model is implemented and run.
            </p>
          )}

          {!planned && !output && !data.runResult?.previewBase64 && (
            <p className="text-xs text-muted-foreground">
              Run this node to see output data and previews.
            </p>
          )}

          {output && (
            <>
              <CategoryPreview
                category={data.category}
                output={output}
                pages={pages}
                pageImageBase64={outputPageImage}
                selectedPageIndex={Number(data.params.page_index ?? 0)}
                onSelectPage={(index) =>
                  updateNodeConfig(nodeId, { page_index: index })
                }
              />
              {showRawJson && (
                <div className="mt-3">
                  <JsonTree data={output.raw} />
                </div>
              )}
            </>
          )}

          {!output && data.runResult?.previewBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${data.runResult.previewBase64}`}
              alt="Run preview"
              className="w-full rounded-sm border border-border bg-secondary/30 object-contain"
            />
          )}

          {data.category === "export" && (
            <div className={output || data.runResult?.previewBase64 ? "mt-3" : ""}>
              <FilePreview format="Markdown / JSON" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
