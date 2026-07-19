"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjectAssetUrl } from "@/lib/api/assets";
import { cn } from "@/lib/utils";

type AssetPreviewProps = {
  projectId: string;
  assetId: string;
  format?: "pdf" | "image" | string;
  filename?: string;
  className?: string;
  /** Max height for embedded preview (compact mode only) */
  maxHeight?: number;
  /** compact = inline panels; large = modal / expanded views */
  size?: "compact" | "large";
};

export function AssetPreview({
  projectId,
  assetId,
  format,
  filename,
  className,
  maxHeight = 420,
  size = "compact",
}: AssetPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const url = getProjectAssetUrl(projectId, assetId);
  const isPdf = format === "pdf" || filename?.toLowerCase().endsWith(".pdf");
  const isLarge = size === "large";
  const compactHeight = Math.min(maxHeight, 200);

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [assetId, url]);

  if (!assetId) {
    return (
      <p className="text-xs text-muted-foreground">No file uploaded yet.</p>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full",
        isLarge && "flex h-full min-h-0 flex-col",
        className,
      )}
    >
      {loading && (
        <div
          className={cn(
            "flex items-center justify-center bg-muted/20",
            isLarge
              ? "absolute inset-0 rounded-xl"
              : "rounded-md border border-border/60",
          )}
          style={isLarge ? undefined : { minHeight: compactHeight }}
        >
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-destructive">
          {error}
        </p>
      )}

      {isPdf ? (
        <iframe
          src={url}
          title={filename ?? "PDF preview"}
          className={cn(
            "nodrag nopan w-full bg-background",
            isLarge
              ? "h-full min-h-0 flex-1 rounded-xl"
              : "rounded-md border border-border/60",
            loading ? "absolute inset-0 opacity-0" : "opacity-100",
          )}
          style={isLarge ? undefined : { height: maxHeight }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Could not load PDF preview.");
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={filename ?? "Image preview"}
          className={cn(
            "nodrag nopan w-full object-contain bg-secondary/10",
            isLarge
              ? "h-full min-h-0 flex-1 rounded-xl"
              : "rounded-md border border-border/60 bg-secondary/20",
            loading ? "absolute inset-0 opacity-0" : "opacity-100",
          )}
          style={isLarge ? undefined : { maxHeight }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Could not load image preview.");
          }}
        />
      )}
    </div>
  );
}
