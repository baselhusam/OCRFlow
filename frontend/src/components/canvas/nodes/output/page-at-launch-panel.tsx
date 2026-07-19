"use client";

import { ArrowUpRight } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { Button } from "@/components/ui/button";
import type { PageArtifactWire } from "@/lib/canvas/resolve-upstream";
import { cn } from "@/lib/utils";

type PageAtLaunchPanelProps = {
  nodeId: string;
  pages: PageArtifactWire[];
  branchNodeId?: string;
};

export function PageAtLaunchPanel({
  nodeId,
  pages,
  branchNodeId,
}: PageAtLaunchPanelProps) {
  const { expandPageBranch, focusNode } = usePipelineGraphActions();
  const hasBranch = Boolean(branchNodeId);

  if (!pages.length) return null;

  const handlePrimary = () => {
    const targetId = expandPageBranch(nodeId);
    if (targetId) focusNode(targetId);
  };

  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        "nodrag nopan h-8 w-full rounded-md text-[11px] font-semibold",
        hasBranch
          ? "border border-[var(--node-accent)]/35 bg-[var(--node-accent)]/10 text-[var(--node-accent)] hover:bg-[var(--node-accent)]/15"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={(event) => {
        event.stopPropagation();
        handlePrimary();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ArrowUpRight className="mr-1.5 size-3.5 shrink-0" />
      {hasBranch ? "Go to Page Branch" : "Expand to node"}
    </Button>
  );
}
