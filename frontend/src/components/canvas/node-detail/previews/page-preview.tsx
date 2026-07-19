"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PagePreviewDialog } from "@/components/canvas/page-preview-dialog";
import { PageThumbnailPanel } from "@/components/canvas/nodes/output/output-panel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { canvasInspectorSectionLabelClassName } from "@/lib/canvas/canvas-chrome";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";
import { cn } from "@/lib/utils";

type PagePreviewProps = {
  pages: PageArtifactWire[];
  selectedIndex?: number;
  onSelectPage?: (index: number) => void;
  className?: string;
  compact?: boolean;
  /** Stack every page in a scrollable column (source loader inspector). */
  scrollAllPages?: boolean;
  /** Wrap the thumbnail picker in a collapsible section. */
  collapsiblePagesPanel?: boolean;
  pagesPanelDefaultOpen?: boolean;
};

function PageImageBlock({
  artifact,
  selected,
  onOpen,
}: {
  artifact: PageArtifactWire;
  selected: boolean;
  onOpen?: (index: number) => void;
}) {
  const idx = artifact.page_index;
  const img = artifact.page?.image_base64;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(idx)}
      className={cn(
        "group w-full space-y-1.5 rounded-sm text-left transition-shadow",
        onOpen && "cursor-zoom-in hover:opacity-95",
        selected &&
          "ring-2 ring-primary/35 ring-offset-2 ring-offset-background",
      )}
      title={onOpen ? `Open page ${idx + 1}` : undefined}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${img}`}
          alt={`Page ${idx + 1}`}
          className="w-full rounded-sm border border-border object-contain bg-secondary/30 transition-colors group-hover:border-primary/30"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-sm border border-border bg-secondary/20 text-xs text-muted-foreground">
          Page {idx + 1}
        </div>
      )}
      <p className="font-mono text-[10px] text-muted-foreground">
        Page {idx + 1}
        {artifact.page?.width && artifact.page?.height
          ? ` · ${artifact.page.width}×${artifact.page.height}`
          : ""}
      </p>
    </button>
  );
}

function PagesPickerSection({
  pages,
  selectedIndex,
  onSelectPage,
  onOpenPage,
  collapsible,
  defaultOpen = false,
}: {
  pages: PageArtifactWire[];
  selectedIndex?: number;
  onSelectPage?: (index: number) => void;
  onOpenPage?: (index: number) => void;
  collapsible: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (pages.length <= 1) return null;

  const panel = (
    <PageThumbnailPanel
      pages={pages}
      selectedIndex={selectedIndex ?? pages[0]?.page_index ?? 0}
      onSelectPage={onSelectPage}
      onOpenPage={onOpenPage}
    />
  );

  if (!collapsible) {
    return panel;
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-t border-border/60 pt-2"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 py-2 text-left hover:opacity-80">
        <div className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
          <span className={canvasInspectorSectionLabelClassName}>Pages</span>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {pages.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">{panel}</CollapsibleContent>
    </Collapsible>
  );
}

export function PagePreview({
  pages,
  selectedIndex,
  onSelectPage,
  className,
  compact = false,
  scrollAllPages = false,
  collapsiblePagesPanel = false,
  pagesPanelDefaultOpen = false,
}: PagePreviewProps) {
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const activeIndex = selectedIndex ?? pages[0]?.page_index ?? 0;
  const [fullscreenPageIndex, setFullscreenPageIndex] = useState<number | null>(
    null,
  );

  const handleOpenPage = (index: number) => {
    setFullscreenPageIndex(index);
    onSelectPage?.(index);
  };

  useEffect(() => {
    if (!scrollAllPages) return;
    const el = pageRefs.current.get(activeIndex);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIndex, scrollAllPages]);

  if (!pages.length) {
    return (
      <p className="text-center text-xs text-muted-foreground">No page data</p>
    );
  }

  if (scrollAllPages) {
    return (
      <>
        <div className={cn("flex min-h-0 flex-col gap-3", className)}>
          <div className="min-h-0 max-h-[min(58vh,560px)] overflow-y-auto overscroll-contain rounded-sm border border-border/60 bg-muted/15 p-2">
            <div className="space-y-4">
              {pages.map((artifact) => {
                const idx = artifact.page_index;
                return (
                  <div
                    key={idx}
                    ref={(element) => {
                      if (element) pageRefs.current.set(idx, element);
                    }}
                  >
                    <PageImageBlock
                      artifact={artifact}
                      selected={idx === activeIndex}
                      onOpen={handleOpenPage}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <PagesPickerSection
            pages={pages}
            selectedIndex={selectedIndex}
            onSelectPage={onSelectPage}
            onOpenPage={handleOpenPage}
            collapsible={collapsiblePagesPanel}
            defaultOpen={pagesPanelDefaultOpen}
          />
        </div>

        <PagePreviewDialog
          open={fullscreenPageIndex !== null}
          onOpenChange={(open) => {
            if (!open) setFullscreenPageIndex(null);
          }}
          pages={pages}
          pageIndex={fullscreenPageIndex ?? activeIndex}
          onPageIndexChange={(index) => {
            setFullscreenPageIndex(index);
            onSelectPage?.(index);
          }}
        />
      </>
    );
  }

  const page = pages.find((p) => p.page_index === selectedIndex) ?? pages[0];
  const img = page?.page?.image_base64;

  if (!compact && img) {
    return (
      <>
        <div className={cn("space-y-2", className)}>
          <PageImageBlock
            artifact={page}
            selected={false}
            onOpen={handleOpenPage}
          />
          <PagesPickerSection
            pages={pages}
            selectedIndex={selectedIndex}
            onSelectPage={onSelectPage}
            onOpenPage={handleOpenPage}
            collapsible={false}
          />
        </div>

        <PagePreviewDialog
          open={fullscreenPageIndex !== null}
          onOpenChange={(open) => {
            if (!open) setFullscreenPageIndex(null);
          }}
          pages={pages}
          pageIndex={fullscreenPageIndex ?? activeIndex}
          onPageIndexChange={(index) => {
            setFullscreenPageIndex(index);
            onSelectPage?.(index);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className={className}>
        <PageThumbnailPanel
          pages={pages}
          selectedIndex={selectedIndex ?? 0}
          onSelectPage={onSelectPage}
          onOpenPage={handleOpenPage}
        />
      </div>

      <PagePreviewDialog
        open={fullscreenPageIndex !== null}
        onOpenChange={(open) => {
          if (!open) setFullscreenPageIndex(null);
        }}
        pages={pages}
        pageIndex={fullscreenPageIndex ?? activeIndex}
        onPageIndexChange={(index) => {
          setFullscreenPageIndex(index);
          onSelectPage?.(index);
        }}
      />
    </>
  );
}
