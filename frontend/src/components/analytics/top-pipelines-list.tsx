import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import type { TopPipelineItem } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type TopPipelinesListProps = {
  pipelines: TopPipelineItem[];
};

export function TopPipelinesList({ pipelines }: TopPipelinesListProps) {
  return (
    <div className={cn(dashboardCardClassName, "h-full p-8 transition-all duration-300 hover:shadow-lg")}>
      <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-foreground">
        Top pipelines
      </h2>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-primary/40" />
        <p className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          by run volume
        </p>
      </div>

      {pipelines.length === 0 ? (
        <div className="mt-8 flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 text-sm text-muted-foreground text-center px-6">
          No pipeline activity recorded in this range yet.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {pipelines.map((pipeline, i) => (
            <div key={pipeline.project_id} className="group/item">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary/80 font-mono text-[10px] font-bold tabular-nums text-primary transition-colors group-hover/item:bg-primary group-hover/item:text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate font-mono text-[13px] font-semibold text-foreground group-hover/item:text-primary transition-colors">
                    {pipeline.name}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[13px] font-bold text-foreground">
                  {pipeline.run_count.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/50 ring-1 ring-border/20">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out group-hover/item:opacity-80"
                  style={{ width: `${Math.max(pipeline.share * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
