"use client";

import { LayoutDetectionOutput } from "@/components/canvas/nodes/output/layout-detection-output";
import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";

type LayoutPreviewProps = {
  regions: RegionWire[];
  pageImageBase64?: string;
  pageIndex?: number;
};

export function LayoutPreview({
  regions,
  pageImageBase64,
  pageIndex = 0,
}: LayoutPreviewProps) {
  return (
    <div className="max-h-[420px] overflow-hidden rounded-sm border border-border">
      <LayoutDetectionOutput
        regions={regions}
        pageImageBase64={pageImageBase64}
        pageIndex={pageIndex}
      />
    </div>
  );
}
