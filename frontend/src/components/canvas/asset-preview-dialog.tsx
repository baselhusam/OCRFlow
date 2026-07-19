"use client";

import { FileImage, FileText } from "lucide-react";

import { AssetPreview } from "@/components/canvas/asset-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AssetPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  assetId: string;
  format?: "pdf" | "image" | string;
  filename?: string;
};

function getFormatLabel(
  format: string | undefined,
  filename: string | undefined,
): { label: string; isPdf: boolean } {
  const isPdf =
    format === "pdf" || filename?.toLowerCase().endsWith(".pdf") === true;
  return { label: isPdf ? "PDF" : "Image", isPdf };
}

export function AssetPreviewDialog({
  open,
  onOpenChange,
  projectId,
  assetId,
  format,
  filename,
}: AssetPreviewDialogProps) {
  const { label, isPdf } = getFormatLabel(format, filename);

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
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
                isPdf
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-[var(--status-ok)]/25 bg-[var(--status-ok)]/10 text-[var(--status-ok)]",
              )}
            >
              {isPdf ? (
                <FileText className="size-4" strokeWidth={1.75} />
              ) : (
                <FileImage className="size-4" strokeWidth={1.75} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold">
                {filename ?? "Document preview"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {label} document · preview before load
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,color-mix(in_srgb,var(--muted)_55%,var(--background))_0%,var(--background)_100%)] p-5 sm:p-6">
          <div className="flex h-[min(72vh,760px)] min-h-[420px] items-stretch justify-center">
            <div className="flex h-full w-full overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_20px_48px_-28px_color-mix(in_srgb,var(--foreground)_22%,transparent)]">
              <AssetPreview
                projectId={projectId}
                assetId={assetId}
                format={format}
                filename={filename}
                size="large"
                className="h-full"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
