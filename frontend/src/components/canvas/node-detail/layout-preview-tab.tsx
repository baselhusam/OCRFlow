"use client";

import { useMemo, useState } from "react";
import { Expand } from "lucide-react";

import { DetailSection } from "@/components/canvas/node-detail/detail-section";
import { JsonTree } from "@/components/canvas/node-detail/previews/json-tree";
import { LayoutPageAnnotation } from "@/components/canvas/nodes/output/layout-page-annotation";
import {
  formatRegionLabel,
  type RegionWire,
} from "@/components/canvas/nodes/output/region-thumbnail-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatComputeTier } from "@/lib/canvas/model-utils";
import { getUpstreamPagesForNode } from "@/lib/canvas/node-readiness";
import {
  getParentLayoutNodeId,
  isRegionBranchNode,
} from "@/lib/canvas/region-branch-meta";
import { layoutLabelColor } from "@/lib/canvas/layout-label-colors";
import { extractPageImage } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { cn } from "@/lib/utils";

type LayoutPreviewTabProps = {
  data: PipelineNodeData;
  upstream: UpstreamContext;
};

function parseRegions(output: PipelineNodeData["cachedOutput"]): RegionWire[] {
  if (!output || output.kind !== "regions") return [];
  return (
    (output.raw as { regions?: RegionWire[] }).regions ?? []
  ).filter(
    (region): region is RegionWire =>
      Boolean(region?.id && Array.isArray(region.bbox) && region.bbox.length === 4),
  );
}

export function LayoutPreviewTab({ data, upstream }: LayoutPreviewTabProps) {
  const { nodes } = usePipelineGraphActions();
  const [highlightedId, setHighlightedId] = useState<string | undefined>();

  const parentOutput = useMemo(() => {
    if (!isRegionBranchNode(data.modelId)) return data.cachedOutput;
    const parentId = getParentLayoutNodeId(data.params);
    const parent = parentId ? nodes.find((node) => node.id === parentId) : undefined;
    return parent?.data.cachedOutput ?? null;
  }, [data.cachedOutput, data.modelId, data.params, nodes]);

  const output = isRegionBranchNode(data.modelId) ? parentOutput : data.cachedOutput;
  const regions = useMemo(() => parseRegions(output), [output]);
  const pageIndex = (output?.raw as { page_index?: number } | undefined)?.page_index ?? 0;
  const meta = (output?.raw as { meta?: { latency_ms?: number } } | undefined)?.meta;
  const pages = getUpstreamPagesForNode(data, upstream);
  const pageImageBase64 =
    extractPageImage(output ?? null)?.image_base64 ??
    output?.preview?.pageImage?.image_base64 ??
    output?.preview?.thumbnailBase64 ??
    extractPageImage(upstream.output ?? null)?.image_base64 ??
    pages[0]?.page?.image_base64;

  const classGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const region of regions) {
      const label = formatRegionLabel(region);
      groups.set(label, (groups.get(label) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => b[1] - a[1]);
  }, [regions]);

  if (!output) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-[18px] py-3">
        <p className="text-xs text-muted-foreground">
          Connect a page source and run this node to preview detected layout regions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DetailSection title="Summary" className="border-b border-border/60 py-4">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
              Page
            </p>
            <p className="mt-1 font-medium text-foreground">p.{pageIndex + 1}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
              Regions
            </p>
            <p className="mt-1 font-medium text-foreground">{regions.length}</p>
          </div>
          {meta?.latency_ms !== undefined && (
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                Latency
              </p>
              <p className="mt-1 font-medium text-foreground">{meta.latency_ms} ms</p>
            </div>
          )}
          {data.compute && (
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                Compute
              </p>
              <p className="mt-1 font-medium text-foreground">
                {formatComputeTier(data.compute)}
              </p>
            </div>
          )}
        </div>
      </DetailSection>

      {pageImageBase64 && regions.length > 0 && (
        <DetailSection title="Annotated page" className="border-b border-border/60 py-4">
          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/10">
            <LayoutPageAnnotation
              imageBase64={pageImageBase64}
              regions={regions}
              pageIndex={pageIndex}
              highlightedId={highlightedId}
              onRegionClick={(region) => setHighlightedId(region.id)}
              showLabels={regions.length <= 18}
            />
            <Dialog>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border/50 bg-card/90 px-2 py-1 font-mono text-[9px] tracking-wide text-muted-foreground uppercase backdrop-blur-sm transition-colors hover:text-foreground"
                  >
                    <Expand className="size-3" />
                    Expand
                  </button>
                }
              />
              <DialogContent className="max-h-[92vh] w-[min(96vw,56rem)] max-w-none gap-3 overflow-hidden p-0 sm:max-w-none">
                <DialogHeader className="border-b border-border px-4 py-3">
                  <DialogTitle className="font-mono text-sm tracking-wide">
                    Layout detection · Page {pageIndex + 1}
                  </DialogTitle>
                  <DialogDescription>
                    {regions.length} region{regions.length === 1 ? "" : "s"} detected
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[calc(92vh-5.5rem)] overflow-y-auto px-4 pb-4">
                  <LayoutPageAnnotation
                    imageBase64={pageImageBase64}
                    regions={regions}
                    pageIndex={pageIndex}
                    highlightedId={highlightedId}
                    onRegionClick={(region) => setHighlightedId(region.id)}
                    showLabels
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </DetailSection>
      )}

      {classGroups.length > 0 && (
        <DetailSection
          title="Regions by class"
          badge={classGroups.length}
          className="border-b border-border/60 py-4"
        >
          <div className="flex flex-wrap gap-1.5">
            {classGroups.map(([label, count]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[10px]"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: layoutLabelColor(label) }}
                  aria-hidden
                />
                <span className="font-medium text-foreground">{label}</span>
                <span className="font-mono text-muted-foreground">{count}</span>
              </span>
            ))}
          </div>
        </DetailSection>
      )}

      {regions.length > 0 && (
        <DetailSection title="Region list" badge={regions.length} className="py-4">
          <div className="space-y-1.5">
            {regions.map((region) => {
              const label = formatRegionLabel(region);
              const selected = region.id === highlightedId;
              const confidence =
                region.confidence !== undefined
                  ? `${Math.round(region.confidence * 100)}%`
                  : null;
              const [x0, y0, x1, y1] = region.bbox;

              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setHighlightedId(region.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                    selected
                      ? "border-[var(--node-layout-detection)]/50 bg-[var(--node-layout-detection)]/8"
                      : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: layoutLabelColor(region.label) }}
                        aria-hidden
                      />
                      <span className="truncate text-[11px] font-medium text-foreground">
                        {label}
                      </span>
                    </div>
                    {confidence && (
                      <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                        {confidence}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                    {region.id} · bbox [{x0.toFixed(2)}, {y0.toFixed(2)}, {x1.toFixed(2)}, {y1.toFixed(2)}]
                  </p>
                </button>
              );
            })}
          </div>
        </DetailSection>
      )}

      <DetailSection title="Raw data" collapsible defaultOpen={false} className="py-2">
        <JsonTree data={output.raw} />
      </DetailSection>
    </div>
  );
}
