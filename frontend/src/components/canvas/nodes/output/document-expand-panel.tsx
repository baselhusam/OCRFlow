"use client";

import { ArrowUpRight } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentExpandPanelProps = {
  nodeId: string;
  hasOutput: boolean;
  branchNodeId?: string;
};

export function DocumentExpandPanel({
  nodeId,
  hasOutput,
  branchNodeId,
}: DocumentExpandPanelProps) {
  const { expandDocumentBranch, focusNode } = usePipelineGraphActions();
  const hasBranch = Boolean(branchNodeId);

  if (!hasOutput) return null;

  const handlePrimary = () => {
    const targetId = expandDocumentBranch(nodeId);
    if (targetId) focusNode(targetId);
  };

  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        "nodrag nopan h-8 w-full rounded-md text-[11px] font-semibold",
        hasBranch
          ? "border border-[var(--node-vlm-convert)]/35 bg-[var(--node-vlm-convert)]/10 text-[var(--node-vlm-convert)] hover:bg-[var(--node-vlm-convert)]/15"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={(event) => {
        event.stopPropagation();
        handlePrimary();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ArrowUpRight className="mr-1.5 size-3.5 shrink-0" />
      {hasBranch ? "Go to Document Branch" : "Expand to node"}
    </Button>
  );
}
