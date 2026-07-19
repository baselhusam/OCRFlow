"use client";

import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";
import { cn } from "@/lib/utils";

type ReadingOrderPreviewProps = {
  regions: RegionWire[];
  orderedIds: string[];
  pageImageBase64?: string;
  className?: string;
};

export function ReadingOrderPreview({
  regions,
  orderedIds,
  pageImageBase64,
  className,
}: ReadingOrderPreviewProps) {
  const regionMap = new Map(regions.map((r) => [r.id, r]));

  return (
    <div className={cn("space-y-2", className)}>
      {pageImageBase64 && (
        <div className="relative overflow-hidden rounded-sm border border-border bg-secondary/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pageImageBase64}`}
            alt="Reading order"
            className="w-full object-contain"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            {orderedIds.map((id, rank) => {
              const region = regionMap.get(id);
              if (!region?.bbox) return null;
              const [x0, y0, x1, y1] = region.bbox;
              const cx = (x0 + x1) / 2;
              const cy = (y0 + y1) / 2;
              return (
                <g key={id}>
                  <rect
                    x={x0}
                    y={y0}
                    width={x1 - x0}
                    height={y1 - y0}
                    fill="rgba(180, 120, 60, 0.12)"
                    stroke="var(--primary)"
                    strokeWidth={0.002}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--primary)"
                    fontSize={0.025}
                    fontFamily="monospace"
                  >
                    {rank + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <ol className="max-h-40 space-y-1 overflow-y-auto overscroll-contain text-xs">
        {orderedIds.map((id, rank) => {
          const region = regionMap.get(id);
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-sm bg-secondary/40 px-2 py-1"
            >
              <span className="font-mono text-[10px] text-[var(--primary)]">
                {rank + 1}
              </span>
              <span className="truncate text-foreground/80">
                {region?.label ?? id}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
