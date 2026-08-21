"use client";

import { useState } from "react";

import { PagePreviewDialog } from "@/components/canvas/page-preview-dialog";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { getUpstreamPagesForNode } from "@/lib/canvas/node-readiness";
import { extractPages } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";
import { cn } from "@/lib/utils";

type PageAtPreviewTabProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
};

export function PageAtPreviewTab({ nodeId, data, upstream }: PageAtPreviewTabProps) {
  const { updateNodeConfig } = usePipelineGraphActions();
  const pages = getUpstreamPagesForNode(data, upstream);
  const selectedIndex = Number(data.params.page_index ?? 0);
  const outputPages = data.cachedOutput ? extractPages(data.cachedOutput) : [];
  const selectedPage =
    outputPages.find((page) => page.page_index === selectedIndex) ??
    outputPages[0] ??
    pages.find((page) => page.page_index === selectedIndex) ??
    pages[0];
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!selectedPage) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[18px] py-3">
        <p className="text-xs text-muted-foreground">
          Connect and run an upstream loader to preview the selected page.
        </p>
      </div>
    );
  }

  const previewPages = pages.length ? pages : outputPages.length ? outputPages : [selectedPage];
  const img = selectedPage.page?.image_base64;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[18px] py-3">
      <button
        type="button"
        onClick={() => img && setPreviewOpen(true)}
        className={cn(
          "w-full overflow-hidden rounded-md border border-border/60 bg-muted/15 text-left transition-colors",
          img && "cursor-zoom-in hover:border-primary/35",
        )}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${img}`}
            alt={`Page ${selectedPage.page_index + 1}`}
            className="max-h-[min(68vh,640px)] w-full object-contain bg-secondary/20 p-2"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            Page {selectedPage.page_index + 1}
          </div>
        )}
      </button>

      <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
        Page {selectedPage.page_index + 1}
        {selectedPage.page?.width && selectedPage.page?.height
          ? ` · ${selectedPage.page.width}×${selectedPage.page.height}`
          : ""}
      </p>

      {img && (
        <PagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          pages={previewPages}
          pageIndex={selectedPage.page_index}
          onPageIndexChange={(index) => updateNodeConfig(nodeId, { page_index: index })}
        />
      )}
    </div>
  );
}
