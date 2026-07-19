import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";

import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { RelativeTime } from "@/components/relative-time";
import type { Project } from "@/lib/api/client";
import {
  getProjectColorTint,
  getProjectIconComponent,
} from "@/lib/projects/appearance";
import { formatProjectMeta, getProjectStats } from "@/lib/projects/stats";

type RecentProjectsProps = {
  projects: Project[];
};

export function RecentProjects({ projects }: RecentProjectsProps) {
  const recent = [...projects]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div
        className={`${dashboardCardClassName} px-6 py-10 text-center`}
      >
        <p className="font-mono text-[11px] tracking-[0.16em] text-primary uppercase">
          No projects yet
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first project to start building a pipeline.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {recent.map((project) => {
        const stats = getProjectStats(project);
        const meta = formatProjectMeta(stats);
        const canvasHref = `/app/projects/${project.id}/canvas`;
        const Icon = getProjectIconComponent(project.icon);
        const tint = getProjectColorTint(project.color);

        return (
          <li key={project.id}>
            <Link
              href={canvasHref}
              className={`group block ${dashboardCardClassName} px-6 py-5 transition-colors hover:border-primary/30 hover:bg-secondary/20`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: tint, color: project.color }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold tracking-[-0.01em] text-foreground">
                      {project.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {project.description?.trim() || "No description yet."}
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  className="size-[18px] shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--landing-hairline)] pt-4">
                <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <GitBranch className="size-3.5" aria-hidden />
                    {meta.nodes}
                  </span>
                  <span className="text-border">·</span>
                  <span>{meta.models}</span>
                  <span className="text-border">·</span>
                  <span>{meta.files}</span>
                </div>
                <span className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
                  <RelativeTime value={project.updated_at} />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
