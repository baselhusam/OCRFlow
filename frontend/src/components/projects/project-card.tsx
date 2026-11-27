"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { GraphThumbnail } from "@/components/app/graph-thumbnail";
import { ProjectCardMenu } from "@/components/projects/project-card-menu";
import { ProjectStatusPill } from "@/components/projects/project-status-pill";
import { RelativeTime } from "@/components/relative-time";
import type { Project } from "@/lib/api/client";
import { getProjectIconComponent } from "@/lib/projects/appearance";
import { getProjectStats } from "@/lib/projects/stats";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  canWrite?: boolean;
  className?: string;
};

export function projectIconTileStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
    color,
  };
}

/**
 * Project card: the whole surface opens the canvas (stretched link on the
 * title), while the actions menu stays independently clickable.
 */
export function ProjectCard({
  project,
  canWrite = true,
  className,
}: ProjectCardProps) {
  const stats = getProjectStats(project);
  const canvasHref = `/app/projects/${project.id}/canvas`;
  const Icon = getProjectIconComponent(project.icon);
  const description = project.description?.trim();

  return (
    <article
      className={cn(
        "project-card group/card relative flex flex-col overflow-hidden",
        project.is_archived && "opacity-80",
        className,
      )}
    >
      <div className="relative">
        <GraphThumbnail
          graph={project.graph}
          accent={project.color}
          className="h-[132px] border-b border-[var(--landing-hairline)]"
          emptyLabel="Empty canvas"
        />
        <span
          className="pointer-events-none absolute right-3 bottom-3 inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground opacity-0 shadow-[0_8px_20px_-8px_var(--accent)] transition-[opacity,transform] duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
          aria-hidden
        >
          Open canvas
          <ArrowRight className="size-3.5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            style={projectIconTileStyle(project.color)}
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">
              <Link
                href={canvasHref}
                className="outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-primary/50 focus-visible:after:ring-inset"
              >
                {project.name}
              </Link>
            </h3>
            <p
              className={cn(
                "mt-0.5 truncate text-[13px]",
                description ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {description || "No description"}
            </p>
          </div>
          {canWrite ? (
            <div className="relative z-10 -mt-1 -mr-1.5">
              <ProjectCardMenu project={project} />
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <ProjectStatusPill project={project} />
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {stats.nodeCount} node{stats.nodeCount === 1 ? "" : "s"}
              {stats.fileCount > 0
                ? ` · ${stats.fileCount} file${stats.fileCount === 1 ? "" : "s"}`
                : ""}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
            <RelativeTime value={project.updated_at} />
          </span>
        </div>
      </div>
    </article>
  );
}
