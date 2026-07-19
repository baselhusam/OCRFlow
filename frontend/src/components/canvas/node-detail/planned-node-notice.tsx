"use client";

import { Clock } from "lucide-react";

import { getPlannedCategoryMessage } from "@/lib/canvas/planned-category-messages";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type { PipelineNodeData } from "@/lib/canvas/types";

type PlannedNodeNoticeProps = {
  data: PipelineNodeData;
};

export function PlannedNodeNotice({ data }: PlannedNodeNoticeProps) {
  if (!isPlannedNode(data.modelId, data.category)) return null;

  return (
    <div className="border-b border-border px-4 py-2">
      <div className="flex items-start gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <Clock className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200/90">
          {getPlannedCategoryMessage(data.category)}
        </p>
      </div>
    </div>
  );
}
