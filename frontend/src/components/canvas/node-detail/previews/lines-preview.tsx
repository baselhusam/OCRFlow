"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type LineWire = {
  id?: string;
  text?: string;
  confidence?: number;
  bbox?: number[];
};

type LinesPreviewProps = {
  lines: LineWire[];
  pageImageBase64?: string;
  showText?: boolean;
  className?: string;
};

export function LinesPreview({
  lines,
  pageImageBase64,
  showText = false,
  className,
}: LinesPreviewProps) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    if (!filter.trim()) return lines;
    const q = filter.toLowerCase();
    return lines.filter((l) => l.text?.toLowerCase().includes(q));
  }, [lines, filter]);

  return (
    <div className={cn("space-y-2", className)}>
      {pageImageBase64 && lines.some((l) => l.bbox?.length === 4) && (
        <div className="relative overflow-hidden rounded-sm border border-border bg-secondary/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pageImageBase64}`}
            alt="Page with lines"
            className="w-full object-contain"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            {lines.map((line, i) => {
              const [x0, y0, x1, y1] = line.bbox ?? [];
              if (x0 === undefined) return null;
              return (
                <rect
                  key={line.id ?? i}
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  fill="rgba(180, 120, 60, 0.15)"
                  stroke="var(--primary)"
                  strokeWidth={0.002}
                />
              );
            })}
          </svg>
        </div>
      )}

      {showText && lines.length > 3 && (
        <input
          type="search"
          placeholder="Filter lines…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs"
        />
      )}

      <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No lines</p>
        ) : (
          filtered.map((line, i) => (
            <div
              key={line.id ?? i}
              className="rounded-sm bg-secondary/40 px-2 py-1.5 text-xs"
            >
              {showText && line.text ? (
                <p className="text-foreground/90">{line.text}</p>
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground">
                  {line.id ?? `line-${i}`}
                  {line.bbox ? ` · [${line.bbox.map((n) => n.toFixed(2)).join(", ")}]` : ""}
                </p>
              )}
              {line.confidence !== undefined && (
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                  conf {(line.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
