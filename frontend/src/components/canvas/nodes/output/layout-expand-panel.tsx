"use client";

import { ArrowUpRight } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { Button } from "@/components/ui/button";
import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";
import { cn } from "@/lib/utils";

type LayoutExpandPanelProps = {
  nodeId: string;
  regions: RegionWire[];
  branchNodeId?: string;
};

export function LayoutExpandPanel({
  nodeId,
  regions,
  branchNodeId,
}: LayoutExpandPanelProps) {
  const { expandRegionBranch, focusNode } = usePipelineGraphActions();
  const hasBranch = Boolean(branchNodeId);

  if (!regions.length) return null;

  const handlePrimary = () => {
    const targetId = expandRegionBranch(nodeId);
    if (targetId) focusNode(targetId);
  };

  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        "nodrag nopan h-8 w-full rounded-md text-[11px] font-semibold",
        hasBranch
          ? "border border-[var(--node-layout-detection)]/35 bg-[var(--node-layout-detection)]/10 text-[var(--node-layout-detection)] hover:bg-[var(--node-layout-detection)]/15"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={(event) => {
        event.stopPropagation();
        handlePrimary();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ArrowUpRight className="mr-1.5 size-3.5 shrink-0" />
      {hasBranch ? "Go to Region Branch" : "Expand to node"}
    </Button>
  );
}
