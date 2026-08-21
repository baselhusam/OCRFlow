import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Cpu,
  FileStack,
  FolderKanban,
  GitBranch,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  dashboardIconTileClassName,
  dashboardInteractiveCardClassName,
  dashboardStatCardClassName,
} from "@/components/dashboard/dashboard-styles";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import type { Project } from "@/lib/api/client";
import { RelativeTime } from "@/components/relative-time";
import type { WorkspaceStats } from "@/lib/projects/stats";

type DashboardStatProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  hintWithDot?: boolean;
};

function DashboardStat({
  label,
  value,
  icon: Icon,
  hint,
  hintWithDot,
}: DashboardStatProps) {
  return (
    <div className={dashboardStatCardClassName}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <Icon className="dashboard-stat-card__icon size-[17px] shrink-0" aria-hidden />
      </div>
      <p className="mt-3.5 text-4xl font-extrabold tracking-[-0.03em] leading-none">
        {value}
      </p>
      {hint ? (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          {hintWithDot ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--status-ok)]" />
              {hint}
            </span>
          ) : (
            hint
          )}
        </p>
      ) : null}
    </div>
  );
}

type DashboardOverviewProps = {
  greeting: string;
  displayName: string;
  stats: WorkspaceStats;
  projects: Project[];
};

export function DashboardOverview({
  greeting,
  displayName,
  stats,
  projects,
}: DashboardOverviewProps) {
  const statCards: DashboardStatProps[] = [
    {
      label: "Projects",
      value: stats.projectCount,
      icon: FolderKanban,
      hint: "total in workspace",
    },
    {
      label: "Pipeline nodes",
      value: stats.totalNodes,
      icon: GitBranch,
      hint:
        stats.activePipelines > 0
          ? `${stats.activePipelines} active pipeline${stats.activePipelines === 1 ? "" : "s"}`
          : "No nodes placed yet",
      hintWithDot: stats.activePipelines > 0,
    },
    {
      label: "Models in use",
      value: stats.uniqueModels,
      icon: Cpu,
      hint: `${stats.totalEdges} connection${stats.totalEdges === 1 ? "" : "s"} across projects`,
    },
    {
      label: "Uploaded files",
      value: stats.totalFiles,
      icon: FileStack,
      hint: "across all projects",
    },
    {
      label: "Runs today",
      value: stats.runsToday > 0 ? stats.runsToday : "—",
      icon: Activity,
      hint:
        stats.runsToday > 0
          ? "projects with a node run today"
          : "No pipeline runs yet today",
    },
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Workspace
          </p>
          <h1 className="mt-3.5 text-[40px] font-extrabold tracking-[-0.035em] leading-[1.02]">
            {greeting}, {displayName}
          </h1>
          <p className="mt-3.5 max-w-[560px] text-base leading-[1.55] text-muted-foreground">
            {stats.projectCount === 0
              ? "Create a project to open the canvas, wire OCR and layout models, and run pipelines headless via the API."
              : stats.totalNodes === 0
                ? "Your projects are ready. Open a canvas to add nodes and build your first pipeline."
                : "Pick up where you left off — open a recent project or browse everything in Projects."}
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <div className="h-px bg-[var(--landing-hairline)]" />

      <section aria-labelledby="workspace-stats-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="workspace-stats-heading"
            className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
          >
            At a glance
          </h2>
          {stats.lastActivityAt ? (
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              Last activity <RelativeTime value={stats.lastActivityAt} />
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat) => (
            <DashboardStat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="recent-projects-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="recent-projects-heading"
              className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
            >
              Recent projects
            </h2>
            {stats.projectCount > 0 ? (
              <Link
                href="/app/projects"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-primary uppercase transition-opacity hover:opacity-80"
              >
                View all
                <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            ) : null}
          </div>
          <RecentProjects projects={projects} />
        </section>

        <section aria-labelledby="quick-links-heading">
          <h2
            id="quick-links-heading"
            className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
          >
            Quick links
          </h2>
          <div className="flex flex-col gap-4">
            <QuickLink
              href="/app/projects"
              icon={Layers}
              title="All projects"
              description="Browse, edit, and open any project canvas."
            />
            <QuickLink
              href="/app/projects"
              icon={Clock3}
              title="Pipeline canvas"
              description="Drag nodes for layout, OCR, tables, and LLM post-processing."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={dashboardInteractiveCardClassName("flex gap-3.5 p-5")}
    >
      <span className={dashboardIconTileClassName}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold tracking-tight text-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-normal text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  );
}
