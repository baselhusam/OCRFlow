import {
  ArrowRight,
  Braces,
  Image,
  LayoutTemplate,
  ListOrdered,
  ScanSearch,
  Sigma,
  Table2,
  Type,
  type LucideIcon,
} from "lucide-react";

import type { PipelineTemplate } from "@/lib/templates/catalog";
import { templateStageLabel } from "@/lib/templates/catalog";
import { cn } from "@/lib/utils";

type TemplateFlowPreviewProps = {
  template: PipelineTemplate;
  className?: string;
  variant?: "hero" | "card";
};

function stageIcon(modelId: string): LucideIcon {
  if (modelId.includes("layout")) return LayoutTemplate;
  if (modelId.includes("text-detection")) return ScanSearch;
  if (modelId.includes("recognition") || modelId.includes("ocr")) return Type;
  if (modelId.includes("reading-order")) return ListOrdered;
  if (modelId.includes("table")) return Table2;
  if (modelId.includes("formula") || modelId.includes("latex")) return Sigma;
  if (modelId.includes("picture") || modelId.includes("caption")) return Image;
  return Braces;
}

export function TemplateFlowPreview({
  template,
  className,
  variant = "card",
}: TemplateFlowPreviewProps) {
  const compact = variant === "card";

  return (
    <section
      aria-label={`${template.name} pipeline preview`}
      className={cn("min-w-0", className)}
    >
      <div className="mb-2 flex justify-end">
        <span className="font-mono text-[10px] text-primary">
          {template.graph.nodes.length} stages
        </span>
      </div>
      <div className={cn("overflow-x-auto", compact ? "pb-1" : "pb-1 sm:pb-2")}>
        <div className="mx-auto flex w-max items-stretch">
          {template.graph.nodes.map((node, index) => {
            const Icon = stageIcon(node.modelId);
            const label = templateStageLabel(node.modelId);

            return (
              <div key={node.id} className="flex items-center">
                <div className={cn("w-[120px] rounded-md border border-[var(--landing-node-border)] bg-background px-3 py-3", !compact && "w-[138px]")}>
                  <div className="flex items-center justify-between">
                    <span className="grid size-6 place-items-center rounded-md bg-primary/[0.08] text-primary">
                      <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">0{index + 1}</span>
                  </div>
                  <p className="mt-2.5 truncate font-mono text-[10px] font-semibold tracking-[0.04em] text-foreground uppercase">
                    {label}
                  </p>
                  <p title={node.modelId} className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                    {node.modelId}
                  </p>
                </div>
                {index < template.graph.nodes.length - 1 ? (
                  <span className="flex w-8 shrink-0 items-center justify-center text-primary/60" aria-hidden>
                    <span className="h-px w-2 bg-primary/35" />
                    <ArrowRight className="size-3" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
