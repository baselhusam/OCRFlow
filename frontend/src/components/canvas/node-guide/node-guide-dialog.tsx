"use client";

import type { ReactElement } from "react";
import { useState } from "react";

import { NodeGuideShell } from "@/components/canvas/node-guide/node-guide-shell";
import { ProviderLogo } from "@/components/canvas/provider-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getNodeGuide } from "@/lib/canvas/node-guide-registry";
import type { PipelineNodeData } from "@/lib/canvas/types";

type NodeGuideDialogProps = {
  data: PipelineNodeData;
  trigger: ReactElement;
};

export function NodeGuideDialog({ data, trigger }: NodeGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const definition = getNodeGuide(data.modelId);

  if (!definition) return null;

  const context = {
    data,
    categoryColor: data.categoryColor,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader className="gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 pr-8">
            <ProviderLogo provider={data.provider} size={32} className="shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-bold tracking-tight">
                How {data.label} works
              </DialogTitle>
              <DialogDescription className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase">
                {data.categoryLabel} guide
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="px-5 py-4">
          {open && (
            <NodeGuideShell
              key={`${data.modelId}-guide`}
              definition={definition}
              context={context}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
