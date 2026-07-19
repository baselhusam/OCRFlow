"use client";

import { Handle, Position } from "@xyflow/react";

import { regionLabelKind, type RegionWire } from "@/lib/canvas/artifact-adapters";
import { buildItemHandle } from "@/lib/canvas/output-slice";
import { cn } from "@/lib/utils";

type ItemOutputHandleProps = {
  itemKind: "region" | "figure" | "line" | "table" | "page";
  itemId: string;
  region?: RegionWire;
  className?: string;
  variant?: "default" | "page-row" | "node-border";
};

const REGION_KIND_DOT: Record<string, string> = {
  figure: "bg-[var(--node-figure-classification)]",
  table: "bg-[var(--node-table-structure)]",
  formula: "bg-[var(--node-formula-recognition)]",
  text: "bg-muted-foreground/60",
  other: "bg-muted-foreground/40",
};

const ITEM_KIND_DOT: Record<ItemOutputHandleProps["itemKind"], string> = {
  page: "bg-[var(--primary)]/80",
  region: "bg-muted-foreground/50",
  figure: "bg-[var(--node-figure-classification)]",
  line: "bg-muted-foreground/60",
  table: "bg-[var(--node-table-structure)]",
};

export function ItemOutputHandle({
  itemKind,
  itemId,
  region,
  className,
  variant = "default",
}: ItemOutputHandleProps) {
  const handleId = buildItemHandle(itemKind, itemId);
  const isPageRow = itemKind === "page" && variant === "page-row";
  const isNodeBorder = variant === "node-border";
  const dotClass =
    region != null
      ? REGION_KIND_DOT[regionLabelKind(region)]
      : isPageRow || isNodeBorder
        ? ""
        : ITEM_KIND_DOT[itemKind];

  const pageLabel =
    itemKind === "page" ? `p.${Number(itemId) + 1}` : `${itemKind} ${itemId}`;

  if (isNodeBorder) {
    return (
      <Handle
        type="source"
        position={Position.Right}
        id={handleId}
        isConnectable
        isConnectableStart
        className={cn(
          "ocrflow-node-border-output-handle !w-3 !h-3 !border-2 !bg-card !relative !transform-none !top-0 !right-0",
          className,
        )}
        style={{ borderColor: "var(--node-accent)" }}
        title={`Drag to connect ${pageLabel} to downstream nodes`}
        aria-label={`Connect output ${pageLabel}`}
      />
    );
  }

  return (
    <div className="flex w-5 shrink-0 items-center justify-center self-center">
      <Handle
        type="source"
        position={Position.Right}
        id={handleId}
        isConnectable
        isConnectableStart
        className={cn(
          "ocrflow-item-output-handle !relative !top-auto !right-auto !translate-x-0 !translate-y-0 !border-2",
          isPageRow
            ? "ocrflow-page-item-output-handle !border-violet-200/90"
            : "!border-background",
          dotClass,
          className,
        )}
        title={`Drag to connect ${pageLabel} to downstream nodes`}
        aria-label={`Connect output ${pageLabel}`}
      />
    </div>
  );
}
