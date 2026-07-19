"use client";

import { CirclePlay, X } from "lucide-react";

import { NodeGuideDialog } from "@/components/canvas/node-guide/node-guide-dialog";
import { ProviderLogo } from "@/components/canvas/provider-logo";
import { Button } from "@/components/ui/button";
import { getCategoryDescription } from "@/lib/canvas/category-meta";
import { hasNodeGuide } from "@/lib/canvas/node-guide-registry";
import type { PipelineNodeData } from "@/lib/canvas/types";

type NodeDetailHeaderProps = {
  data: PipelineNodeData;
  onClose: () => void;
};

export function NodeDetailHeader({ data, onClose }: NodeDetailHeaderProps) {
  const showGuide = hasNodeGuide(data.modelId);

  return (
    <div className="shrink-0 border-b border-border px-[18px] py-4">
      <div className="flex items-start gap-3">
        <ProviderLogo
          provider={data.provider}
          size={38}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] leading-tight font-bold tracking-tight text-foreground">
            {data.label}
          </p>
          <div
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              backgroundColor: `color-mix(in srgb, ${data.categoryColor} 14%, var(--card))`,
            }}
          >
            <span
              className="size-1.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: data.categoryColor }}
              aria-hidden
            />
            <span
              className="font-mono text-[9.5px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: data.categoryColor }}
            >
              {data.categoryLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {showGuide && (
            <NodeGuideDialog
              data={data}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-[30px] rounded-lg border-border text-muted-foreground"
                  aria-label={`How ${data.label} works`}
                  title="How it works"
                >
                  <CirclePlay className="size-3.5" />
                </Button>
              }
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-[30px] rounded-lg border-border text-muted-foreground"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {getCategoryDescription(data.category)}
      </p>
    </div>
  );
}
