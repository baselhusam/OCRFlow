import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Code2,
  FileStack,
  Keyboard,
  LayoutTemplate,
  Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GraphThumbnail, SAMPLE_GRAPH } from "@/components/app/graph-thumbnail";
import { PageHeader } from "@/components/app/page-header";
import { EngineStatusCard } from "@/components/dashboard/engine-status-card";
import { ShortcutsLink } from "@/components/dashboard/shortcuts-link";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { NewProjectCard } from "@/components/projects/new-project-card";
import { ProjectCard } from "@/components/projects/project-card";
import { RelativeTime } from "@/components/relative-time";
import { TemplateQuickStart } from "@/components/templates/template-quick-start";
import { buttonVariants } from "@/components/ui/button";
import type { Pipeline, Project } from "@/lib/api/client";
import { isPipelineReady } from "@/lib/api/pipelines";
import type { PipelineJobSummary } from "@/lib/api/jobs";
import type { WorkspaceStats } from "@/lib/projects/stats";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  greeting: string;
  displayName: string;
  stats: WorkspaceStats;
  projects: Project[];
  pipelines: Pipeline[];
  jobs: PipelineJobSummary[];
  canWrite: boolean;
  isAdmin: boolean;
};

function SectionHeading({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2
          id={id}
          className="text-[17px] font-bold tracking-[-0.015em] text-foreground"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

const ONBOARDING_STEPS = [
  {
    title: "Create a project",
    body: "You land on an empty canvas right away.",
  },
  {
    title: "Wire a loader to models",
    body: "Drop in a PDF or image loader, then layout, OCR, or LLM extraction nodes.",
  },
  {
    title: "Run, export, or call it",
    body: "Run on the canvas, export Markdown or JSON, or hit it over the HTTP API.",
  },
];

function OnboardingHero({ canWrite }: { canWrite: boolean }) {
  return (
    <section
      aria-labelledby="onboarding-heading"
      className="dashboard-hero overflow-hidden rounded-2xl border border-border"
    >
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-primary uppercase">
            Get started
          </p>
          <h2
            id="onboarding-heading"
            className="mt-2 text-[24px] font-extrabold leading-tight tracking-[-0.025em] text-foreground sm:text-[26px]"
          >
            Build your first OCR pipeline
          </h2>
          <ol className="mt-5 space-y-3.5">
            {ONBOARDING_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-[11px] font-semibold text-primary dark:bg-primary/25">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-foreground">
                    {step.title}
                  </span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {canWrite ? <CreateProjectDialog /> : null}
            <Link
              href="/documentation/quick-start"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              Quick start guide
            </Link>
          </div>
        </div>
        <GraphThumbnail
          graph={SAMPLE_GRAPH}
          className="hidden h-[220px] rounded-xl border border-[var(--landing-hairline)] sm:block"
        />
      </div>
    </section>
  );
}

function StatStrip({ stats, jobs }: { stats: WorkspaceStats; jobs: PipelineJobSummary[] }) {
  const documentsProcessed = jobs.reduce((sum, job) => sum + job.succeeded_count, 0);
  const items = [
    { label: "Projects", value: stats.projectCount },
    { label: "Nodes placed", value: stats.totalNodes },
    { label: "Models in use", value: stats.uniqueModels },
    { label: "Files uploaded", value: stats.totalFiles },
    { label: "Docs processed", value: documentsProcessed },
    { label: "Projects run today", value: stats.runsToday },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-border bg-card px-5 py-3.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <dd className="text-[20px] font-extrabold tabular-nums tracking-[-0.02em] text-foreground">
            {item.value}
          </dd>
          <dt className="font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground uppercase">
            {item.label}
          </dt>
        </div>
      ))}
      {stats.lastActivityAt ? (
        <div className="ml-auto hidden items-baseline gap-2 self-center md:flex">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground uppercase">
            Last activity
          </span>
          <span className="font-mono text-[11px] text-foreground">
            <RelativeTime value={stats.lastActivityAt} />
          </span>
        </div>
      ) : null}
    </dl>
  );
}

function RecentJobs({
  jobs,
  readyPipelines,
  canWrite,
}: {
  jobs: PipelineJobSummary[];
  readyPipelines: number;
  canWrite: boolean;
}) {
  if (jobs.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <span className="flex size-9 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
          <FileStack className="size-[18px]" aria-hidden />
        </span>
        <h2 className="mt-3 text-[15px] font-bold tracking-[-0.01em] text-foreground">
          Process documents in bulk
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
          {readyPipelines > 0
            ? "Apply a ready pipeline to a batch of files and trace every document."
            : "Save a canvas as a pipeline (or use a template), then apply it to a whole batch."}
        </p>
        {canWrite ? (
          <Link
            href={readyPipelines > 0 ? "/app/jobs/new" : "/app/pipelines"}
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
          >
            {readyPipelines > 0 ? "Start a job" : "Go to pipelines"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="recent-jobs-heading"
      className="rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h2
          id="recent-jobs-heading"
          className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
        >
          Recent jobs
        </h2>
        <SectionLink href="/app/jobs">All jobs</SectionLink>
      </div>
      <ul className="divide-y divide-[var(--landing-hairline)] border-t border-[var(--landing-hairline)]">
        {jobs.slice(0, 4).map((job) => (
          <li key={job.id}>
            <Link
              href={`/app/jobs/${job.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-primary/[0.035]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                  {job.pipeline_name ?? "Pipeline"}
                </span>
                <span className="block font-mono text-[10.5px] text-muted-foreground">
                  {job.document_count} doc{job.document_count === 1 ? "" : "s"} ·{" "}
                  <RelativeTime value={job.created_at} />
                </span>
              </span>
              <JobStatusBadge status={job.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResourceLink({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      {title}
    </Link>
  );
}

export function DashboardOverview({
  greeting,
  displayName,
  stats,
  projects,
  pipelines,
  jobs,
  canWrite,
  isAdmin,
}: DashboardOverviewProps) {
  const recent = [...projects]
    .filter((project) => !project.is_archived)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 4);
  const readyPipelines = pipelines.filter(
    (pipeline) => !pipeline.is_archived && isPipelineReady(pipeline),
  ).length;
  const isNew = projects.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting}, ${displayName}`}
        description={
          isNew
            ? "Welcome to OCRFlow. Start with a blank canvas or clone a ready-made pipeline below."
            : "Pick up where you left off, or start something new."
        }
        actions={
          canWrite ? (
            <>
              {readyPipelines > 0 ? (
                <Link
                  href="/app/jobs/new"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 gap-2 rounded-lg px-4 text-sm font-semibold",
                  )}
                >
                  <Play className="size-4" aria-hidden />
                  Run a job
                </Link>
              ) : null}
              {!isNew ? <CreateProjectDialog /> : null}
            </>
          ) : null
        }
      />

      {!isNew ? <StatStrip stats={stats} jobs={jobs} /> : null}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          {isNew ? (
            <OnboardingHero canWrite={canWrite} />
          ) : (
            <section aria-labelledby="recent-projects-heading">
              <SectionHeading
                id="recent-projects-heading"
                title="Jump back in"
                description="Your most recently edited canvases."
                action={<SectionLink href="/app/projects">All projects</SectionLink>}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {recent.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    canWrite={canWrite}
                  />
                ))}
                {canWrite && recent.length < 4 ? <NewProjectCard /> : null}
              </div>
            </section>
          )}

          <section aria-labelledby="templates-heading">
            <SectionHeading
              id="templates-heading"
              title="Start from a template"
              description="One click clones a proven pipeline into your account and opens its canvas."
              action={<SectionLink href="/templates">All templates</SectionLink>}
            />
            <TemplateQuickStart
              canWrite={canWrite}
              className="xl:grid-cols-2 2xl:grid-cols-4"
            />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <EngineStatusCard
            manageHref={isAdmin ? "/app/configuration" : "/documentation/models"}
          />
          <RecentJobs
            jobs={jobs}
            readyPipelines={readyPipelines}
            canWrite={canWrite}
          />
          <section className="rounded-xl border border-border bg-card p-2">
            <h2 className="px-2 pt-2 pb-1 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Resources
            </h2>
            <ResourceLink href="/documentation/quick-start" icon={BookOpen} title="Quick start" />
            <ResourceLink href="/documentation/api" icon={Code2} title="HTTP API reference" />
            <ResourceLink href="/templates" icon={LayoutTemplate} title="Template library" />
            <ShortcutsLink icon={<Keyboard className="size-4 text-muted-foreground" aria-hidden />} />
          </section>
        </aside>
      </div>
    </div>
  );
}
