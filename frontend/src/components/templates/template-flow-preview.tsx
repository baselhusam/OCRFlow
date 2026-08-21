import type { PipelineTemplate } from "@/lib/templates/catalog";
import { templateStageLabel } from "@/lib/templates/catalog";
import { cn } from "@/lib/utils";

type TemplateFlowPreviewProps = {
  template: PipelineTemplate;
  className?: string;
};

export function TemplateFlowPreview({
  template,
  className,
}: TemplateFlowPreviewProps) {
  const steps = template.graph.nodes;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--landing-node-border)] px-4 py-2.5">
        <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          pipeline.canvas
        </span>
        <span className="font-mono text-[11px] text-primary">
          {steps.length} stages
        </span>
      </div>
      <div className="flex items-stretch divide-x divide-[var(--landing-node-border)] overflow-x-auto">
        {steps.map((node, index) => {
          const label = templateStageLabel(node.modelId);

          return (
            <div
              key={node.id}
              className="relative flex min-w-[108px] flex-1 flex-col px-4 py-3"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-px z-10 hidden h-px w-2 bg-primary/40 md:block"
                />
              ) : null}
              <span
                className="h-1 w-7 rounded-full"
                style={{
                  backgroundColor: template.accentColor,
                  opacity: 0.5 + index * 0.12,
                }}
              />
              <span className="mt-2.5 truncate font-mono text-[11px] tracking-wide text-foreground uppercase">
                {label}
              </span>
              <span className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {node.modelId}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
