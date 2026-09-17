"use client";

import { Braces, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AssetPreview } from "@/components/canvas/asset-preview";
import { JsonTreeInline } from "@/components/canvas/node-detail/previews/json-tree";
import { CanvasOutputPreview } from "@/components/canvas/nodes/preview/canvas-output-preview";
import { PreviewEmpty } from "@/components/canvas/nodes/preview/preview-primitives";
import { mappedForPage, mappedPageIndexes } from "@/lib/canvas/map-execution";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { canvasInspectorSectionLabelClassName } from "@/lib/canvas/canvas-chrome";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { formatComputeTier } from "@/lib/canvas/model-utils";
import {
  summarizeInput,
  summarizeOutput,
} from "@/lib/canvas/node-preview-summary";
import { getUpstreamPagesForNode } from "@/lib/canvas/node-readiness";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import {
  resolveOutputPageImage,
  type UpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type NodeDetailPreviewSectionProps = {
  nodeId: string;
  data: PipelineNodeData;
  upstream: UpstreamContext;
};

type Side = "input" | "output";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-muted/15 px-2.5 py-1.5">
      <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function RawJson({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:text-foreground">
        <Braces className="size-3" aria-hidden />
        Raw JSON
        <ChevronDown
          className={cn(
            "ml-auto size-3 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 max-h-72 overflow-auto rounded-md border border-border/60 bg-background p-2">
          <JsonTreeInline data={value} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Inspector preview: the same output-aware renderer the canvas card uses,
 * with an Input/Output switch, run stats and the raw payload on demand.
 * Flips to Output automatically when a run finishes. Mount it with
 * `key={nodeId}` so the side resets when another node is selected.
 */
export function NodeDetailPreviewSection({
  nodeId,
  data,
  upstream,
}: NodeDetailPreviewSectionProps) {
  const { projectId, nodes, edges, updateNodeConfig } =
    usePipelineGraphActions();
  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const planned = isPlannedNode(data.modelId, data.category);
  const fullOutput = data.cachedOutput ?? null;
  const mappedPages = mappedPageIndexes(fullOutput);
  const isMapped = mappedPages.length > 0;
  const [viewPage, setViewPage] = useState<number | null>(null);
  const shownPage =
    viewPage ??
    (fullOutput?.raw as { page_index?: number } | null)?.page_index ??
    Number(data.params.page_index ?? mappedPages[0] ?? 0);
  const output = isMapped ? (mappedForPage(fullOutput, shownPage) ?? fullOutput) : fullOutput;
  const hasOutput = Boolean(output || data.runResult?.previewBase64);
  const pages = getUpstreamPagesForNode(data, upstream);
  const selectedPageIndex = Number(data.params.page_index ?? 0);

  const [side, setSide] = useState<Side>(hasOutput ? "output" : "input");
  const sectionRef = useRef<HTMLElement>(null);
  const prevStatus = useRef(data.runStatus);

  // Run just finished → show its output and bring it into view.
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = data.runStatus;
    if (was === "running" && data.runStatus === "success") {
      setSide("output");
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [data.runStatus]);

  const pageImage = resolveOutputPageImage(
    nodeId,
    output ?? upstream.output ?? null,
    nodes,
    edges,
  );

  const inputSummary = summarizeInput(data, upstream);
  const outputSummary = summarizeOutput(data);
  const meta = (output?.raw as { meta?: { latency_ms?: number } } | undefined)
    ?.meta;
  const assetId = data.params.assetId as string | undefined;

  const showSwitch = !isSourceLoader;
  const activeSide: Side = showSwitch ? side : "output";

  let body: React.ReactNode;
  if (activeSide === "output") {
    if (output || data.runResult?.previewBase64) {
      body = (
        <div className="space-y-3">
          {(meta?.latency_ms !== undefined ||
            data.compute ||
            data.lastRunAt) && (
            <div className="grid grid-cols-3 gap-1.5">
              {meta?.latency_ms !== undefined && (
                <Stat
                  label="Latency"
                  value={`${Math.round(meta.latency_ms)} ms`}
                />
              )}
              {data.compute && (
                <Stat label="Compute" value={formatComputeTier(data.compute)} />
              )}
              {data.lastRunAt && (
                <Stat
                  label="Last run"
                  value={new Date(data.lastRunAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              )}
            </div>
          )}
          <CanvasOutputPreview
            output={output}
            pages={pages}
            pageImageBase64={pageImage?.image_base64}
            pageImageUrl={pageImage?.image_url}
            selectedPageIndex={selectedPageIndex}
            onSelectPage={(index) =>
              updateNodeConfig(nodeId, { page_index: index })
            }
            fallbackPreviewBase64={data.runResult?.previewBase64}
            category={data.category}
          />
          {output && <RawJson value={output.raw} />}
        </div>
      );
    } else if (isSourceLoader && assetId) {
      body = (
        <AssetPreview
          projectId={projectId}
          assetId={assetId}
          format={data.params.format as string | undefined}
          filename={data.params.assetFilename as string | undefined}
          maxHeight={480}
        />
      );
    } else {
      body = (
        <PreviewEmpty
          title={planned ? "Model not available yet" : "No output yet"}
          hint={
            planned
              ? "Output preview will appear once this model is implemented."
              : isSourceLoader
                ? "Upload a document above, then load it."
                : "Run this node to see what it produces."
          }
        />
      );
    }
  } else if (upstream.output || pages.length) {
    body = (
      <div className="space-y-3">
        <CanvasOutputPreview
          output={upstream.output}
          pages={pages}
          pageImageBase64={pageImage?.image_base64}
          pageImageUrl={pageImage?.image_url}
          selectedPageIndex={selectedPageIndex}
          onSelectPage={(index) =>
            updateNodeConfig(nodeId, { page_index: index })
          }
          category={data.category}
        />
        {upstream.output && <RawJson value={upstream.output.raw} />}
      </div>
    );
  } else {
    body = (
      <PreviewEmpty
        title="No input yet"
        hint={
          data.category === "export"
            ? "Expects a document from an upstream assembler or VLM node."
            : "Connect an upstream node and run it to see the input here."
        }
      />
    );
  }

  return (
    <section
      ref={sectionRef}
      className="border-t border-border/60 px-[18px] py-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className={canvasInspectorSectionLabelClassName}>Preview</h3>
          {isMapped && activeSide === "output" && (
            <select
              value={shownPage}
              onChange={(event) => setViewPage(Number(event.target.value))}
              aria-label="Page result"
              className="h-6 rounded-md border border-[var(--node-accent)]/40 bg-[var(--node-accent)]/8 px-1.5 font-mono text-[10px] text-foreground focus-visible:outline-none"
            >
              {mappedPages.map((page) => (
                <option key={page} value={page}>
                  p.{page + 1} / {mappedPages.length}
                </option>
              ))}
            </select>
          )}
        </div>
        {showSwitch && (
          <div className="flex gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5">
            {(["input", "output"] as const).map((entry) => {
              const summary = entry === "input" ? inputSummary : outputSummary;
              return (
                <button
                  key={entry}
                  type="button"
                  aria-pressed={side === entry}
                  onClick={() => setSide(entry)}
                  className={cn(
                    "flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[10.5px] font-medium capitalize transition-colors",
                    side === entry
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry}
                  {summary && (
                    <span className="font-mono text-[9px] font-normal text-muted-foreground">
                      {summary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {body}
    </section>
  );
}
