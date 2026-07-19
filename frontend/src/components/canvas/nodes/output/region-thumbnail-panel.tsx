"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNodeId, useUpdateNodeInternals } from "@xyflow/react";

import { cropBboxFromBase64, type NormalizedBBox } from "@/lib/canvas/crop-region";
import { ItemOutputHandle } from "@/components/canvas/nodes/output/item-output-handle";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import { cn } from "@/lib/utils";

const REGION_BATCH = 12;

/** Scrollable output lists — scrollbar hidden, wheel/trackpad scroll still works. */
const NODE_SCROLL_AREA =
  "ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 overflow-y-auto overscroll-contain";

export type RegionWire = {
  id: string;
  label: string;
  bbox: NormalizedBBox;
  confidence?: number;
  docling_label?: string | null;
  provider_label?: string | null;
};

export type RegionDisplayMode = "compact" | "semantic";

type RegionCropThumbProps = {
  imageBase64: string;
  bbox: NormalizedBBox;
  alt: string;
  onImageLoad?: () => void;
};

function RegionCropThumb({ imageBase64, bbox, alt, onImageLoad }: RegionCropThumbProps) {
  const [src, setSrc] = useState<string | null>(null);
  const bboxKey = bbox.join(",");

  useEffect(() => {
    let cancelled = false;
    void cropBboxFromBase64(imageBase64, bbox).then((b64) => {
      if (!cancelled && b64) {
        setSrc(b64);
        onImageLoad?.();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [imageBase64, bbox, bboxKey, onImageLoad]);

  if (!src) {
    return (
      <div className="flex h-12 items-center justify-center bg-secondary/30 text-[9px] text-muted-foreground">
        …
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/png;base64,${src}`}
      alt={alt}
      className="h-12 w-full object-contain bg-secondary/30"
    />
  );
}

export function formatRegionLabel(region: RegionWire): string {
  return region.docling_label ?? region.provider_label ?? region.label;
}

type RegionThumbnailPanelProps = {
  regions: RegionWire[];
  pageImageBase64?: string;
  selectedId?: string;
  onSelectRegion?: (region: RegionWire) => void;
  displayMode?: RegionDisplayMode;
  showConnectionPorts?: boolean;
  portVariant?: "default" | "region-branch";
  fillContainer?: boolean;
  onPortRowMount?: (regionId: string, element: HTMLDivElement | null) => void;
  onScrollContainerMount?: (element: HTMLDivElement | null) => void;
  onPortLayoutChange?: () => void;
};

export function RegionThumbnailPanel({
  regions,
  pageImageBase64,
  selectedId,
  onSelectRegion,
  displayMode = "semantic",
  showConnectionPorts = false,
  portVariant = "default",
  fillContainer = false,
  onPortRowMount,
  onScrollContainerMount,
  onPortLayoutChange,
}: RegionThumbnailPanelProps) {
  const [visibleCount, setVisibleCount] = useState(REGION_BATCH);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const visible = useMemo(
    () => regions.slice(0, visibleCount),
    [regions, visibleCount],
  );
  const isCompact = displayMode === "compact";
  const isRegionBranchPorts = showConnectionPorts && portVariant === "region-branch";
  const displayRegions = isRegionBranchPorts ? regions : visible;

  useLayoutEffect(() => {
    if (!isRegionBranchPorts) return;
    onPortLayoutChange?.();
  }, [isRegionBranchPorts, displayRegions.length, regions.length, onPortLayoutChange]);

  useEffect(() => {
    if (!isRegionBranchPorts || !scrollRef.current) return;
    const scrollEl = scrollRef.current;
    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        onPortLayoutChange?.();
      });
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [isRegionBranchPorts, onPortLayoutChange]);

  useRefreshNodeHandles(regions.length, visibleCount, pageImageBase64);

  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();
  const handleThumbLoad = useCallback(() => {
    onPortLayoutChange?.();
    if (!nodeId) return;
    requestAnimationFrame(() => updateNodeInternals(nodeId));
  }, [nodeId, onPortLayoutChange, updateNodeInternals]);

  if (!regions.length) {
    return (
      <p className="px-2 py-3 text-center text-[10px] text-muted-foreground">
        No regions
      </p>
    );
  }

  const renderRegionRow = (region: RegionWire) => {
    const selected = region.id === selectedId;
    const label = formatRegionLabel(region);
    const confidence =
      region.confidence !== undefined
        ? `${Math.round(region.confidence * 100)}%`
        : null;

    return (
      <div
        key={region.id}
        ref={isRegionBranchPorts ? (el) => onPortRowMount?.(region.id, el) : undefined}
        className={cn(
          "flex items-stretch",
          showConnectionPorts && !isRegionBranchPorts ? "relative pr-6" : "gap-0.5",
          isRegionBranchPorts && "ocrflow-region-branch-row-anchor items-stretch gap-1.5",
        )}
      >
        <button
          type="button"
          onClick={() => onSelectRegion?.(region)}
          className={cn(
            "nodrag nopan min-w-0 flex-1 overflow-hidden text-left transition-colors",
            isCompact
              ? "ocrflow-output-glass-card rounded-lg border border-white/20 hover:border-white/40 dark:border-white/10 dark:hover:border-white/25"
              : "rounded-sm border",
            !isCompact &&
              (selected
                ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
                : "border-border hover:border-muted-foreground/50"),
            isCompact &&
              selected &&
              "border-[var(--node-layout-detection)]/70 ring-2 ring-[var(--node-layout-detection)]/40",
          )}
        >
          {pageImageBase64 ? (
            <RegionCropThumb
              key={`${region.id}-${region.bbox.join(",")}`}
              imageBase64={pageImageBase64}
              bbox={region.bbox}
              alt={label}
              onImageLoad={handleThumbLoad}
            />
          ) : (
            <div className="flex h-12 items-center justify-center bg-secondary/30 px-1 text-center text-[9px] text-muted-foreground">
              {label}
            </div>
          )}
          <div
            className={cn(
              "px-1.5 py-1",
              isCompact ? "flex items-center justify-between gap-1" : "space-y-0.5 px-1 py-0.5",
            )}
          >
            <p
              className="truncate font-mono text-[9px] font-medium text-foreground/90"
              title={label}
            >
              {label}
            </p>
            {!isCompact && (
              <p className="flex items-center justify-between gap-1 font-mono text-[8px] text-muted-foreground">
                <span className="truncate" title={region.id}>
                  {region.id}
                </span>
                {confidence && <span className="shrink-0">{confidence}</span>}
              </p>
            )}
            {isCompact && confidence && (
              <span className="shrink-0 font-mono text-[8px] text-muted-foreground">
                {confidence}
              </span>
            )}
          </div>
        </button>
        {isRegionBranchPorts ? null : showConnectionPorts ? (
          <div className="absolute top-1/2 right-0 flex w-6 -translate-y-1/2 items-center justify-center">
            <ItemOutputHandle
              itemKind="region"
              itemId={region.id}
              region={region}
              variant="page-row"
            />
          </div>
        ) : (
          <ItemOutputHandle itemKind="region" itemId={region.id} region={region} />
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        fillContainer ? "h-full min-h-0" : isCompact ? "max-h-[320px]" : "max-h-[260px]",
        isRegionBranchPorts && "ocrflow-region-branch-thumbnails h-full min-h-0",
      )}
    >
      {isRegionBranchPorts ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={(el) => {
              scrollRef.current = el;
              onScrollContainerMount?.(el);
            }}
            className={cn(
              NODE_SCROLL_AREA,
              "ocrflow-region-branch-scroll flex-1 space-y-1.5 py-1.5 pl-1.5 pr-2",
            )}
          >
            {displayRegions.map((region) => renderRegionRow(region))}
          </div>
          {visibleCount < regions.length && !isRegionBranchPorts && (
            <button
              type="button"
              className="nodrag nopan shrink-0 border-t border-border/25 px-2 py-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase hover:bg-secondary/40"
              onClick={() => setVisibleCount((c) => c + REGION_BATCH)}
            >
              +{Math.min(REGION_BATCH, regions.length - visibleCount)} more
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={cn(NODE_SCROLL_AREA, "flex-1 space-y-1.5 px-1.5 py-1.5")}>
            {visible.map((region) => renderRegionRow(region))}
          </div>
          {visibleCount < regions.length && (
            <button
              type="button"
              className="nodrag nopan border-t border-border px-2 py-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase hover:bg-secondary/40"
              onClick={() => setVisibleCount((c) => c + REGION_BATCH)}
            >
              +{Math.min(REGION_BATCH, regions.length - visibleCount)} more
            </button>
          )}
        </>
      )}
    </div>
  );
}
