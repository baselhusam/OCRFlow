"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Cpu,
  FileStack,
  GitBranch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { ProjectInfoDialog } from "@/components/projects/project-info-dialog";
import { RelativeTime } from "@/components/relative-time";
import type { Project } from "@/lib/api/client";
import { getProjectStats } from "@/lib/projects/stats";

type ProjectListProps = {
  projects: Project[];
};

function ProjectStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-[10px] tracking-[0.06em] text-foreground/90">
        {value}
      </span>
    </div>
  );
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <ul className="divide-y divide-border border border-border bg-card">
      {projects.map((project) => {
        const stats = getProjectStats(project);
        const canvasHref = `/app/projects/${project.id}/canvas`;

        return (
          <li
            key={project.id}
            className="group relative transition-colors hover:bg-secondary/30"
          >
            <Link
              href={canvasHref}
              className="block px-5 py-4 pr-24 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bronze/30"
            >
              <div className="min-w-0">
                <p className="font-medium tracking-tight transition-colors group-hover:text-bronze">
                  {project.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description?.trim() || "No description yet."}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3">
                <ProjectStat
                  icon={GitBranch}
                  label="Nodes"
                  value={stats.nodeCount}
                />
                <ProjectStat
                  icon={Cpu}
                  label="Models"
                  value={stats.modelCount}
                />
                <ProjectStat
                  icon={FileStack}
                  label="Files"
                  value={stats.fileCount}
                />
                <ProjectStat
                  icon={Clock3}
                  label="Last run"
                  value={
                    stats.lastRunAt ? (
                      <RelativeTime value={stats.lastRunAt} />
                    ) : (
                      "—"
                    )
                  }
                />
                <span className="ml-auto font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  Updated <RelativeTime value={project.updated_at} />
                </span>
              </div>
            </Link>

            <div className="pointer-events-none absolute top-4 right-5 flex items-center gap-0.5">
              <div className="pointer-events-auto">
                <ProjectInfoDialog project={project} stats={stats} />
              </div>
              <div className="pointer-events-auto">
                <EditProjectDialog project={project} />
              </div>
              <span
                aria-hidden
                className="inline-flex size-7 items-center justify-center text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bronze"
              >
                <ArrowUpRight className="size-4" />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
