"use client";

import { layoutLabelColor } from "@/lib/canvas/layout-label-colors";
import { cn } from "@/lib/utils";

import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";

export function formatRegionLabel(region: RegionWire): string {
  return region.docling_label ?? region.provider_label ?? region.label;
}

type LayoutPageAnnotationProps = {
  imageBase64: string;
  regions: RegionWire[];
  pageIndex?: number;
  highlightedId?: string;
  onRegionClick?: (region: RegionWire) => void;
  showLabels?: boolean;
  className?: string;
};

export function LayoutPageAnnotation({
  imageBase64,
  regions,
  pageIndex = 0,
  highlightedId,
  onRegionClick,
  showLabels = true,
  className,
}: LayoutPageAnnotationProps) {
  return (
    <div className={cn("relative w-full", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${imageBase64}`}
        alt={`Page ${pageIndex + 1} layout`}
        className="block w-full bg-secondary/20"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0">
        {regions.map((region) => {
          const [x0, y0, x1, y1] = region.bbox;
          const color = layoutLabelColor(region.label);
          const selected = region.id === highlightedId;
          const label = formatRegionLabel(region);
          const heightPct = (y1 - y0) * 100;

          return (
            <button
              key={region.id}
              type="button"
              title={`${label} (${region.id})`}
              onClick={
                onRegionClick
                  ? (event) => {
                      event.stopPropagation();
                      onRegionClick(region);
                    }
                  : undefined
              }
              className={cn(
                "absolute box-border border transition-[box-shadow,background-color]",
                onRegionClick && "pointer-events-auto cursor-pointer",
              )}
              style={{
                left: `${x0 * 100}%`,
                top: `${y0 * 100}%`,
                width: `${(x1 - x0) * 100}%`,
                height: `${heightPct}%`,
                borderColor: color,
                borderWidth: selected ? 2 : 1,
                backgroundColor: selected
                  ? `${color}44`
                  : `${color}22`,
                boxShadow: selected ? `0 0 0 1px ${color}` : undefined,
              }}
            >
              {showLabels && heightPct >= 2.5 && (
                <span
                  className="absolute -top-px left-0 max-w-full -translate-y-full truncate px-0.5 py-px font-mono text-[7px] leading-none font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
