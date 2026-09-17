"use client";

import { Check, Copy, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cropImageRegion,
  type NormalizedBBox,
} from "@/lib/canvas/crop-region";
import { cn } from "@/lib/utils";

/** Scrollable region inside a node: wheel/drag/pan events stay local. */
export const PREVIEW_SCROLL =
  "ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 overflow-y-auto overscroll-contain";

export type StageBox = {
  id: string;
  bbox: NormalizedBBox;
  color?: string;
  /** Short label drawn in the corner badge (e.g. "title", "3"). */
  tag?: string;
};

type PreviewStageProps = {
  imageBase64?: string | null;
  imageUrl?: string | null;
  /** Pre-resolved source (data URL or URL); wins over the other two. */
  imageSrc?: string | null;
  alt: string;
  boxes?: StageBox[];
  highlightedId?: string | null;
  onHoverBox?: (id: string | null) => void;
  onSelectBox?: (id: string) => void;
  /** Show the corner tag on every box, not only the highlighted one. */
  alwaysShowTags?: boolean;
  /** Pixel cap for the stage height inside the card. */
  maxHeight?: number;
  /** Optional caption drawn on top of the stage (e.g. "p.2 · 1240×1754"). */
  caption?: ReactNode;
  className?: string;
};

function imageSrc(base64?: string | null, url?: string | null): string | null {
  if (base64) return `data:image/png;base64,${base64}`;
  if (url) return url;
  return null;
}

/**
 * Page image with normalized bounding boxes drawn over it. Boxes are pure
 * overlays (percent-positioned divs) so they scale with the image and stay
 * crisp at any canvas zoom.
 */
export function PreviewStage({
  imageBase64,
  imageUrl,
  imageSrc: explicitSrc,
  alt,
  boxes = [],
  highlightedId = null,
  onHoverBox,
  onSelectBox,
  alwaysShowTags = false,
  maxHeight = 240,
  caption,
  className,
}: PreviewStageProps) {
  const [expanded, setExpanded] = useState(false);
  const src = explicitSrc ?? imageSrc(imageBase64, imageUrl);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-[11px] text-muted-foreground",
          className,
        )}
      >
        No page image available for this output.
      </div>
    );
  }

  const overlay = (
    <>
      {boxes.map((box) => {
        const [x0, y0, x1, y1] = box.bbox;
        const color = box.color ?? "var(--pulse)";
        const active = highlightedId === box.id;
        const showTag = box.tag && (alwaysShowTags || active);
        return (
          <button
            key={box.id}
            type="button"
            aria-label={box.tag ? `${box.tag} region` : "Region"}
            className={cn(
              "nodrag nopan absolute box-border rounded-[2px] border transition-[background-color,box-shadow,opacity] duration-150",
              onSelectBox ? "cursor-pointer" : "cursor-default",
              highlightedId && !active && "opacity-55",
            )}
            style={{
              left: `${x0 * 100}%`,
              top: `${y0 * 100}%`,
              width: `${(x1 - x0) * 100}%`,
              height: `${(y1 - y0) * 100}%`,
              borderColor: color,
              backgroundColor: active ? `${color}55` : `${color}26`,
              boxShadow: active ? `0 0 0 1.5px ${color}` : undefined,
            }}
            onMouseEnter={() => onHoverBox?.(box.id)}
            onMouseLeave={() => onHoverBox?.(null)}
            onClick={(event) => {
              event.stopPropagation();
              onSelectBox?.(box.id);
            }}
          >
            {showTag && (
              <span
                className="pointer-events-none absolute -top-px -left-px rounded-br-[3px] rounded-tl-[2px] px-1 py-px font-mono text-[8px] leading-tight tracking-wide text-white uppercase"
                style={{ backgroundColor: color }}
              >
                {box.tag}
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <>
      <div
        className={cn(
          "group/stage relative overflow-hidden rounded-lg border border-border/60 bg-[color-mix(in_srgb,var(--foreground)_4%,var(--background))]",
          className,
        )}
      >
        <div
          className="nowheel nodrag nopan relative mx-auto w-fit max-w-full"
          style={{ maxHeight }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="block h-auto max-w-full object-contain select-none"
            style={{ maxHeight }}
          />
          {overlay}
        </div>

        {caption && (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md border border-border/60 bg-card/90 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground backdrop-blur-sm">
            {caption}
          </div>
        )}

        <button
          type="button"
          aria-label="Open full size"
          className="nodrag nopan absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md border border-border/60 bg-card/90 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-foreground group-hover/stage:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:outline-none"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(true);
          }}
        >
          <Maximize2 className="size-3" />
        </button>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,64rem)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-sm">{alt}</DialogTitle>
            <DialogDescription className="text-xs">
              {boxes.length > 0
                ? `${boxes.length} item${boxes.length === 1 ? "" : "s"} highlighted`
                : "Full-size preview"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-4.5rem)] overflow-auto p-4">
            <div className="relative mx-auto w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="block h-auto max-w-full select-none"
              />
              {overlay}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ChipProps = {
  color?: string;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  className?: string;
};

/** Small legend / summary chip with an optional color swatch. */
export function PreviewChip({
  color,
  children,
  active = false,
  onClick,
  onHover,
  className,
}: ChipProps) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={
        onClick
          ? (event: React.MouseEvent) => {
              event.stopPropagation();
              onClick();
            }
          : undefined
      }
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      className={cn(
        "nodrag nopan inline-flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 font-mono text-[9px] tracking-wide whitespace-nowrap transition-colors",
        active
          ? "border-foreground/30 bg-foreground/8 text-foreground"
          : "border-border/60 bg-secondary/40 text-muted-foreground",
        onClick && "hover:border-foreground/30 hover:text-foreground",
        className,
      )}
    >
      {color && (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      {children}
    </Tag>
  );
}

/** Section label used inside preview bodies. */
export function PreviewLabel({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
        {children}
      </span>
      {trailing}
    </div>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "nodrag nopan inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 font-mono text-[9px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:outline-none",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? (
        <Check className="size-3 text-[var(--status-ok)]" />
      ) : (
        <Copy className="size-3" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Confidence meter: thin bar + percentage. */
export function ConfidenceMeter({
  value,
  className,
}: {
  value?: number | null;
  className?: string;
}) {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone =
    pct >= 85
      ? "var(--status-ok)"
      : pct >= 60
        ? "var(--status-warn)"
        : "var(--destructive)";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
      title={`Confidence ${pct}%`}
    >
      <span className="h-1 w-8 overflow-hidden rounded-full bg-border/70">
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: tone }}
        />
      </span>
      <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </span>
  );
}

/** Lazily cropped region of a page image. */
export function CropThumb({
  src: imageSrc,
  bbox,
  alt,
  className,
  maxWidth = 320,
}: {
  /** Data URL or http(s) URL of the page image. */
  src: string;
  bbox: NormalizedBBox;
  alt: string;
  className?: string;
  maxWidth?: number;
}) {
  const key = useMemo(() => `${bbox.join(",")}|${maxWidth}`, [bbox, maxWidth]);
  // Store the crop with the key it was made for, so a bbox change shows the
  // loading state instead of a stale crop (no setState-in-effect reset).
  const [crop, setCrop] = useState<{ key: string; src: string } | null>(null);
  const src = crop?.key === key ? crop.src : null;

  useEffect(() => {
    let cancelled = false;
    void cropImageRegion(imageSrc, bbox, maxWidth).then((b64) => {
      if (!cancelled && b64) setCrop({ key, src: b64 });
    });
    return () => {
      cancelled = true;
    };
    // bbox identity changes on every render for array literals; key is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, key, maxWidth]);

  if (!src) {
    return (
      <div
        className={cn(
          "flex h-20 items-center justify-center rounded-md bg-muted/30 font-mono text-[9px] text-muted-foreground",
          className,
        )}
      >
        Cropping…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/png;base64,${src}`}
      alt={alt}
      draggable={false}
      className={cn(
        "block max-h-40 w-full rounded-md border border-border/60 bg-[color-mix(in_srgb,var(--foreground)_4%,var(--background))] object-contain select-none",
        className,
      )}
    />
  );
}

/** Empty / instructional state inside a preview body. */
export function PreviewEmpty({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
      {icon && <span className="text-muted-foreground/70">{icon}</span>}
      <p className="text-[11px] font-medium text-foreground/85">{title}</p>
      {hint && (
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
