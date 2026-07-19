"use client";

import { useState } from "react";

import { PagePreview } from "@/components/canvas/node-detail/previews/page-preview";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";
import { cn } from "@/lib/utils";

type DocumentPreviewProps = {
  markdown?: string;
  json?: unknown;
  pages?: PageArtifactWire[];
  pageCount?: number;
  className?: string;
};

type DocTab = "markdown" | "json" | "pages";

export function DocumentPreview({
  markdown,
  json,
  pages = [],
  pageCount,
  className,
}: DocumentPreviewProps) {
  const [tab, setTab] = useState<DocTab>(
    markdown ? "markdown" : pages.length ? "pages" : "json",
  );

  const tabs: DocTab[] = [];
  if (markdown) tabs.push("markdown");
  if (json !== undefined) tabs.push("json");
  if (pages.length) tabs.push("pages");

  return (
    <div className={cn("space-y-2", className)}>
      {pageCount !== undefined && (
        <p className="font-mono text-[10px] text-muted-foreground">
          {pageCount} page{pageCount === 1 ? "" : "s"}
        </p>
      )}

      {tabs.length > 1 && (
        <div className="flex gap-0.5 rounded-sm border border-border p-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-sm px-2 py-1 font-mono text-[9px] tracking-wide uppercase transition-colors",
                tab === t
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "markdown" && markdown && (
        <pre className="max-h-64 overflow-auto overscroll-contain whitespace-pre-wrap rounded-sm border border-border bg-secondary/20 p-3 text-xs leading-relaxed text-foreground/90">
          {markdown}
        </pre>
      )}

      {tab === "json" && json !== undefined && (
        <pre className="max-h-64 overflow-auto overscroll-contain rounded-sm border border-border bg-secondary/20 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
          {JSON.stringify(json, null, 2)}
        </pre>
      )}

      {tab === "pages" && pages.length > 0 && <PagePreview pages={pages} />}
    </div>
  );
}

export function JsonPreview({ data }: { data: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto overscroll-contain rounded-sm border border-border bg-secondary/20 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function FilePreview({
  format,
  sizeHint,
}: {
  format?: string;
  sizeHint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-border bg-secondary/20 px-4 py-6 text-center">
      <p className="font-mono text-xs tracking-wide text-foreground uppercase">
        {format ?? "File"} export
      </p>
      {sizeHint && (
        <p className="text-[10px] text-muted-foreground">{sizeHint}</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Export models are planned — preview will show download when available.
      </p>
    </div>
  );
}
