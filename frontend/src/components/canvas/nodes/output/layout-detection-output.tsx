"use client";

import { Expand, List, Scan } from "lucide-react";
import { useState } from "react";

import { LayoutPageAnnotation } from "@/components/canvas/nodes/output/layout-page-annotation";
import {
  RegionThumbnailPanel,
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
import { cn } from "@/lib/utils";

/** Scrollable output lists — scrollbar hidden, wheel/trackpad scroll still works. */
const NODE_SCROLL_AREA =
  "ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 overflow-y-auto overscroll-contain";

type LayoutTab = "page" | "list";

type LayoutDetectionOutputProps = {
  regions: RegionWire[];
  pageImageBase64?: string;
  pageIndex?: number;
};

export function LayoutDetectionOutput({
  regions,
  pageImageBase64,
  pageIndex = 0,
}: LayoutDetectionOutputProps) {
  const [tab, setTab] = useState<LayoutTab>("page");
  const [highlightedId, setHighlightedId] = useState<string | undefined>();

  if (!pageImageBase64) {
    return (
      <RegionThumbnailPanel
        regions={regions}
        selectedId={highlightedId}
        onSelectRegion={(region) => setHighlightedId(region.id)}
      />
    );
  }

  return (
    <div className="flex max-h-[260px] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-border px-1.5 py-1">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => setTab("page")}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[8px] tracking-wide uppercase transition-colors",
              tab === "page"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Scan className="size-2.5" />
            Page
          </button>
          <button
            type="button"
            onClick={() => setTab("list")}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[8px] tracking-wide uppercase transition-colors",
              tab === "list"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-2.5" />
            List
          </button>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <button
                type="button"
                className="nodrag nopan inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 font-mono text-[8px] tracking-wide text-muted-foreground uppercase transition-colors hover:bg-secondary/60 hover:text-foreground"
                title="Expand annotated page"
              >
                <Expand className="size-2.5" />
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
                on the page fed to the model.
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

      <p className="shrink-0 px-1.5 pt-1 font-mono text-[8px] text-muted-foreground">
        p.{pageIndex + 1} · {regions.length} regions
        {tab === "list" ? " · drag row dots to connect" : " · use List to connect items"}
      </p>

      {tab === "page" ? (
        <div className={cn(NODE_SCROLL_AREA, "flex-1 px-1.5 pb-1.5")}>
          <LayoutPageAnnotation
            imageBase64={pageImageBase64}
            regions={regions}
            pageIndex={pageIndex}
            highlightedId={highlightedId}
            onRegionClick={(region) => setHighlightedId(region.id)}
            showLabels={regions.length <= 14}
          />
        </div>
      ) : (
        <RegionThumbnailPanel
          regions={regions}
          pageImageBase64={pageImageBase64}
          selectedId={highlightedId}
          onSelectRegion={(region) => setHighlightedId(region.id)}
        />
      )}
    </div>
  );
}
