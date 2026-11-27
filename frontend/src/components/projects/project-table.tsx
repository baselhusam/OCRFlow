"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";

import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { projectIconTileStyle } from "@/components/projects/project-card";
import { ProjectCardMenu } from "@/components/projects/project-card-menu";
import { ProjectStatusPill } from "@/components/projects/project-status-pill";
import { RelativeTime } from "@/components/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Project } from "@/lib/api/client";
import { getProjectIconComponent } from "@/lib/projects/appearance";
import { getProjectStats } from "@/lib/projects/stats";
import { cn } from "@/lib/utils";

type ProjectTableProps = {
  projects: Project[];
  canWrite?: boolean;
};

const headClassName =
  "h-10 px-4 font-mono text-[10.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase";

const numericHeadClassName = cn(headClassName, "text-right");

const numericCellClassName =
  "px-4 text-right font-mono text-[13px] tabular-nums text-foreground/90";

function ProjectTableRow({
  project,
  canWrite,
}: {
  project: Project;
  canWrite: boolean;
}) {
  const router = useRouter();
  const stats = getProjectStats(project);
  const canvasHref = `/app/projects/${project.id}/canvas`;
  const Icon = getProjectIconComponent(project.icon);
  const description = project.description?.trim();
  const hasDescription = Boolean(description);

  // The whole row is a navigation target, but links, buttons, and the
  // actions menu inside it must keep their own behaviour.
  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, [role='menu'], [role='menuitem']")) return;
    router.push(canvasHref);
  }

  return (
    <TableRow
      onClick={handleRowClick}
      className="group/row cursor-pointer border-[var(--landing-hairline)] transition-colors hover:bg-primary/[0.035]"
    >
      <TableCell className="px-4 py-3.5 whitespace-normal">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            href={canvasHref}
            className="flex size-9 shrink-0 items-center justify-center rounded-[9px] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={projectIconTileStyle(project.color)}
            aria-label={`Open ${project.name}`}
            tabIndex={-1}
          >
            <Icon className="size-[18px]" aria-hidden />
          </Link>
          <div className="min-w-0">
            <Link
              href={canvasHref}
              className="block truncate text-[15px] font-bold tracking-[-0.01em] text-foreground outline-none transition-colors group-hover/row:text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {project.name}
            </Link>
            <p
              className={cn(
                "mt-0.5 line-clamp-1 max-w-[440px] text-[13px] leading-snug",
                hasDescription
                  ? "text-muted-foreground"
                  : "text-muted-foreground/70",
              )}
            >
              {hasDescription ? description : "No description yet."}
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-4">
        <ProjectStatusPill project={project} />
      </TableCell>

      <TableCell className={numericCellClassName}>{stats.nodeCount}</TableCell>
      <TableCell className={cn(numericCellClassName, "hidden md:table-cell")}>
        {stats.modelCount}
      </TableCell>
      <TableCell className={cn(numericCellClassName, "hidden md:table-cell")}>
        {stats.fileCount}
      </TableCell>

      <TableCell className="hidden px-4 font-mono text-[10px] tracking-[0.04em] text-muted-foreground uppercase sm:table-cell">
        <RelativeTime value={project.updated_at} />
      </TableCell>

      <TableCell className="px-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={canvasHref}
            className="hidden items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-primary opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:inline-flex"
          >
            Open
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          {canWrite ? <ProjectCardMenu project={project} /> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProjectTable({ projects, canWrite = true }: ProjectTableProps) {
  return (
    <div className={cn(dashboardCardClassName, "overflow-hidden")}>
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--landing-hairline)] bg-foreground/[0.025] hover:bg-foreground/[0.025]">
            <TableHead className={headClassName}>Project</TableHead>
            <TableHead className={headClassName}>Status</TableHead>
            <TableHead className={numericHeadClassName}>Nodes</TableHead>
            <TableHead className={cn(numericHeadClassName, "hidden md:table-cell")}>
              Models
            </TableHead>
            <TableHead className={cn(numericHeadClassName, "hidden md:table-cell")}>
              Files
            </TableHead>
            <TableHead className={cn(headClassName, "hidden sm:table-cell")}>
              Updated
            </TableHead>
            <TableHead className={cn(headClassName, "w-28 px-3")}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <ProjectTableRow
              key={project.id}
              project={project}
              canWrite={canWrite}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
