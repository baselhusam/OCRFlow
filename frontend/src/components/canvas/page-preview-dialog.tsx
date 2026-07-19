"use client";

import { ChevronLeft, ChevronRight, FileImage } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";
import { cn } from "@/lib/utils";

type PagePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PageArtifactWire[];
  pageIndex: number;
  onPageIndexChange?: (index: number) => void;
};

export function PagePreviewDialog({
  open,
  onOpenChange,
  pages,
  pageIndex,
  onPageIndexChange,
}: PagePreviewDialogProps) {
  const page =
    pages.find((entry) => entry.page_index === pageIndex) ?? pages[0];
  const currentIndex = page?.page_index ?? 0;
  const position = pages.findIndex((entry) => entry.page_index === currentIndex);
  const img = page?.page?.image_base64;
  const hasMultiple = pages.length > 1;
  const canGoPrev = position > 0;
  const canGoNext = position >= 0 && position < pages.length - 1;

  const goPrev = () => {
    if (!canGoPrev) return;
    onPageIndexChange?.(pages[position - 1].page_index);
  };

  const goNext = () => {
    if (!canGoNext) return;
    onPageIndexChange?.(pages[position + 1].page_index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-[color-mix(in_srgb,var(--foreground)_45%,transparent)] backdrop-blur-md"
        className={cn(
          "flex max-h-[min(90vh,920px)] w-[min(94vw,1120px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
          "border-border/60 bg-card shadow-[0_32px_80px_-24px_color-mix(in_srgb,var(--foreground)_28%,transparent)]",
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 pr-14 text-left">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <FileImage className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold">
                Page {currentIndex + 1}
                {pages.length > 1 ? ` of ${pages.length}` : ""}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {page?.page?.width && page?.page?.height
                  ? `${page.page.width}×${page.page.height}px`
                  : "Document page preview"}
              </DialogDescription>
            </div>
            {hasMultiple && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canGoPrev}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,color-mix(in_srgb,var(--muted)_55%,var(--background))_0%,var(--background)_100%)] p-5 sm:p-6">
          <div className="flex h-[min(72vh,760px)] min-h-[420px] items-stretch justify-center">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_20px_48px_-28px_color-mix(in_srgb,var(--foreground)_22%,transparent)]">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${img}`}
                  alt={`Page ${currentIndex + 1}`}
                  className="h-full w-full object-contain bg-secondary/10 p-2"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No image available for page {currentIndex + 1}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
