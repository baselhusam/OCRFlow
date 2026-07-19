"use client";

import { ArrowUpRight } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CaptionExpandPanelProps = {
  nodeId: string;
  lineCount: number;
  branchNodeId?: string;
};

export function CaptionExpandPanel({
  nodeId,
  lineCount,
  branchNodeId,
}: CaptionExpandPanelProps) {
  const { expandCaptionBranch, focusNode } = usePipelineGraphActions();
  const hasBranch = Boolean(branchNodeId);

  if (!lineCount) return null;

  const handlePrimary = () => {
    const targetId = expandCaptionBranch(nodeId);
    if (targetId) focusNode(targetId);
  };

  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        "nodrag nopan h-8 w-full rounded-md text-[11px] font-semibold",
        hasBranch
          ? "border border-[var(--node-figure-captioning)]/35 bg-[var(--node-figure-captioning)]/10 text-[var(--node-figure-captioning)] hover:bg-[var(--node-figure-captioning)]/15"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={(event) => {
        event.stopPropagation();
        handlePrimary();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ArrowUpRight className="mr-1.5 size-3.5 shrink-0" />
      {hasBranch ? "Go to Caption Branch" : "Expand to node"}
    </Button>
  );
}
