"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";

import { projectCardClassName } from "@/components/dashboard/dashboard-styles";
import { ProjectCardMenu } from "@/components/projects/project-card-menu";
import { RelativeTime } from "@/components/relative-time";
import type { Project } from "@/lib/api/client";
import {
  getProjectColorTint,
  getProjectIconComponent,
} from "@/lib/projects/appearance";
import {
  getArchivedStatusStyles,
  getProjectDisplayStatus,
  getProjectStatusStyles,
} from "@/lib/projects/status";
import { formatProjectMeta, getProjectStats } from "@/lib/projects/stats";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  canWrite?: boolean;
};

function ProjectStatusPill({ project }: { project: Project }) {
  const styles = project.is_archived
    ? getArchivedStatusStyles()
    : getProjectStatusStyles(
        getProjectDisplayStatus(project),
        project.color,
      );

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: styles.pillBg,
        color: styles.pillColor,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: styles.dotColor }}
        aria-hidden
      />
      {styles.label}
    </span>
  );
}

export function ProjectCard({ project, canWrite = true }: ProjectCardProps) {
  const stats = getProjectStats(project);
  const meta = formatProjectMeta(stats);
  const canvasHref = `/app/projects/${project.id}/canvas`;
  const Icon = getProjectIconComponent(project.icon);
  const tint = getProjectColorTint(project.color);
  const description = project.description?.trim();
  const hasDescription = Boolean(description);

  return (
    <article className={cn(projectCardClassName, "relative flex flex-col")}>
      <div className="flex items-start justify-between gap-3">
        <Link
          href={canvasHref}
          className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          style={{ backgroundColor: tint, color: project.color }}
          aria-label={`Open ${project.name}`}
        >
          <Icon className="size-[21px]" aria-hidden />
        </Link>

        <div className="flex items-start gap-1.5">
          <ProjectStatusPill project={project} />
          {canWrite ? <ProjectCardMenu project={project} /> : null}
        </div>
      </div>

      <Link
        href={canvasHref}
        className="mt-[18px] flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <h2 className="text-lg font-bold tracking-[-0.01em] text-foreground">
          {project.name}
        </h2>
        <p
          className={cn(
            "mt-1.5 min-h-[42px] line-clamp-2 text-sm leading-normal",
            hasDescription ? "text-muted-foreground" : "text-muted-foreground/70",
          )}
        >
          {hasDescription ? description : "No description yet."}
        </p>

        <div className="mt-[18px] flex items-center justify-between gap-3 border-t border-[var(--landing-hairline)] pt-4">
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3" aria-hidden />
              {meta.nodes}
            </span>
            <span className="text-border">·</span>
            <span>{meta.models}</span>
            <span className="text-border">·</span>
            <span>{meta.files}</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.04em] text-muted-foreground uppercase">
            <RelativeTime value={project.updated_at} />
          </span>
        </div>
      </Link>
    </article>
  );
}
