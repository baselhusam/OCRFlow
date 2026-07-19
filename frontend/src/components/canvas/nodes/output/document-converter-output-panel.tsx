"use client";

import { Braces, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import type { NodeCachedOutput } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const NODE_SCROLL_AREA =
  "ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 overflow-y-auto overscroll-contain";

type DocumentTab = "markdown" | "json";

type DocumentConverterOutputPanelProps = {
  output: NodeCachedOutput;
  className?: string;
  /** Fill the parent panel height (Document Branch resizable view). */
  fillContainer?: boolean;
};

function extractDocumentFields(output: NodeCachedOutput) {
  const raw = output.raw as {
    markdown?: string;
    document?: { pages?: unknown[]; metadata?: Record<string, unknown> };
    metadata?: Record<string, unknown>;
    json?: unknown;
  };

  const markdown =
    (typeof raw.markdown === "string" ? raw.markdown : undefined) ??
    output.preview?.markdownPreview;
  const json =
    output.preview?.jsonPreview ?? raw.json ?? raw.document ?? output.raw;
  const pages = Array.isArray(raw.document?.pages) ? raw.document.pages : [];
  const pageCount =
    output.preview?.pageCount ??
    output.preview?.itemCount ??
    pages.length;

  return {
    markdown,
    json,
    pageCount,
    pipeline: raw.metadata?.pipeline as string | undefined,
  };
}

export function DocumentConverterOutputPanel({
  output,
  className,
  fillContainer = false,
}: DocumentConverterOutputPanelProps) {
  const { markdown, json, pageCount, pipeline } = useMemo(
    () => extractDocumentFields(output),
    [output],
  );

  const tabs = useMemo(() => {
    const available: DocumentTab[] = [];
    if (markdown) available.push("markdown");
    if (json !== undefined) available.push("json");
    return available;
  }, [json, markdown]);

  const [tab, setTab] = useState<DocumentTab>(
    markdown ? "markdown" : "json",
  );

  const activeTab = tabs.includes(tab) ? tab : (tabs[0] ?? "markdown");

  if (!tabs.length) {
    return (
      <p className="flex h-full items-center justify-center px-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        Run this node to preview the converted document.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        fillContainer ? "h-full min-h-0" : "max-h-[300px]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-border/40 px-1.5 py-1">
        <div className="flex gap-0.5">
          {markdown && (
            <button
              type="button"
              onClick={() => setTab("markdown")}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[8px] tracking-wide uppercase transition-colors",
                activeTab === "markdown"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-2.5" />
              Markdown
            </button>
          )}
          {json !== undefined && (
            <button
              type="button"
              onClick={() => setTab("json")}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[8px] tracking-wide uppercase transition-colors",
                activeTab === "json"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Braces className="size-2.5" />
              JSON
            </button>
          )}
        </div>
        {pageCount > 0 && (
          <span className="font-mono text-[8px] text-muted-foreground/80">
            {pageCount}p
          </span>
        )}
      </div>

      {pipeline && (
        <p className="shrink-0 truncate px-2 pt-1 font-mono text-[8px] text-muted-foreground/70">
          {pipeline}
        </p>
      )}

      <div className={cn(NODE_SCROLL_AREA, "flex-1 px-1.5 py-1.5")}>
        {activeTab === "markdown" && markdown && (
          <div className="ocrflow-document-converter-markdown ocrflow-output-glass-card nodrag nopan rounded-lg px-3 py-2.5">
            <div className="ocrflow-caption-markdown text-[11px] leading-[1.65] text-foreground/90">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          </div>
        )}

        {activeTab === "json" && json !== undefined && (
          <pre className="ocrflow-output-glass-card nodrag nopan rounded-lg px-2.5 py-2 font-mono text-[9px] leading-relaxed whitespace-pre-wrap break-words text-foreground/80">
            {JSON.stringify(json, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function hasDocumentConverterOutput(
  modelId: string,
  output: NodeCachedOutput | null | undefined,
): boolean {
  if (!isDocumentConverterOutput(modelId, output)) return false;
  return hasDocumentArtifactOutput(output);
}

export function hasDocumentArtifactOutput(
  output: NodeCachedOutput | null | undefined,
): boolean {
  if (output?.kind !== "document") return false;
  const { markdown, pageCount } = extractDocumentFields(output);
  return pageCount > 0 || Boolean(markdown?.trim());
}

export function isDocumentConverterOutput(
  modelId: string,
  output: NodeCachedOutput | null | undefined,
): output is NodeCachedOutput {
  return isDocumentConverterNode(modelId) && output?.kind === "document";
}
