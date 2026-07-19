"use client";

import { useEffect, useState } from "react";

import { cropBboxFromBase64, type NormalizedBBox } from "@/lib/canvas/crop-region";

type FigureWire = {
  id?: string;
  category?: string;
  caption?: string;
  description?: string;
  bbox?: NormalizedBBox;
};

type FigurePreviewProps = {
  figures: FigureWire[];
  pageImageBase64?: string;
};

function FigureCrop({
  imageBase64,
  bbox,
  alt,
}: {
  imageBase64: string;
  bbox: NormalizedBBox;
  alt: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void cropBboxFromBase64(imageBase64, bbox).then((b64) => {
      if (!cancelled && b64) setSrc(b64);
    });
    return () => {
      cancelled = true;
    };
  }, [imageBase64, bbox]);

  if (!src) {
    return (
      <div className="flex h-24 items-center justify-center rounded-sm bg-secondary/30 text-[10px] text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/png;base64,${src}`}
      alt={alt}
      className="h-24 w-full rounded-sm border border-border object-contain bg-secondary/30"
    />
  );
}

export function FigurePreview({ figures, pageImageBase64 }: FigurePreviewProps) {
  if (!figures.length) {
    return <p className="text-xs text-muted-foreground">No figures</p>;
  }

  const categories = figures.reduce<Record<string, number>>((acc, f) => {
    const cat = f.category ?? "unknown";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.keys(categories).length > 1 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(categories).map(([cat, count]) => (
            <span
              key={cat}
              className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-foreground/70"
            >
              {cat}: {count}
            </span>
          ))}
        </div>
      )}

      {figures.map((figure, i) => (
        <div key={figure.id ?? i} className="space-y-1.5 rounded-sm border border-border p-2">
          {pageImageBase64 && figure.bbox ? (
            <FigureCrop
              imageBase64={pageImageBase64}
              bbox={figure.bbox}
              alt={figure.id ?? `figure-${i}`}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] text-muted-foreground">
              {figure.id ?? `figure-${i}`}
            </p>
            {figure.category && (
              <span className="rounded-sm bg-secondary px-1 py-0.5 font-mono text-[9px]">
                {figure.category}
              </span>
            )}
          </div>
          {(figure.description || figure.caption) && (
            <p className="text-xs leading-relaxed text-foreground/85">
              {figure.description ?? figure.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
