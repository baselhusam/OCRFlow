"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, LayoutGrid, List } from "lucide-react";

import { GraphThumbnail, SAMPLE_GRAPH } from "@/components/app/graph-thumbnail";
import {
  EmptyState,
  ListSearch,
  ListToolbar,
  SegmentedControl,
  SortSelect,
} from "@/components/app/list-toolbar";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { NewProjectCard } from "@/components/projects/new-project-card";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectTable } from "@/components/projects/project-table";
import { TemplateQuickStart } from "@/components/templates/template-quick-start";
import type { Project } from "@/lib/api/client";
import { isActiveProject } from "@/lib/projects/status";
import {
  getProjectsViewModeServerSnapshot,
  readProjectsViewMode,
  subscribeProjectsViewMode,
  writeProjectsViewMode,
  type ProjectsViewMode,
} from "@/lib/projects/view-prefs";
import { cn } from "@/lib/utils";

type ProjectsViewProps = {
  projects: Project[];
  canWrite?: boolean;
};

type ProjectsTab = "all" | "active" | "archived";
type ProjectsSort = "recent" | "name-asc" | "name-desc";

const SORT_OPTIONS: { key: ProjectsSort; label: string }[] = [
  { key: "recent", label: "Last updated" },
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
];

const VIEW_OPTIONS: {
  key: ProjectsViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { key: "cards", label: "Card view", icon: LayoutGrid },
  { key: "table", label: "Table view", icon: List },
];

function matchesTab(project: Project, tab: ProjectsTab): boolean {
  if (tab === "all") return !project.is_archived;
  if (tab === "active") return isActiveProject(project);
  return project.is_archived;
}

function filterProjects(
  projects: Project[],
  tab: ProjectsTab,
  query: string,
): Project[] {
  const normalizedQuery = query.trim().toLowerCase();

  return projects.filter((project) => {
    if (!matchesTab(project, tab)) return false;
    if (!normalizedQuery) return true;
    const description = project.description?.toLowerCase() ?? "";
    return (
      project.name.toLowerCase().includes(normalizedQuery) ||
      description.includes(normalizedQuery)
    );
  });
}

function sortProjects(projects: Project[], sort: ProjectsSort): Project[] {
  const sorted = [...projects];
  if (sort === "name-asc") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "name-desc") {
    return sorted.sort((a, b) => b.name.localeCompare(a.name));
  }
  return sorted.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function ProjectsEmptyState({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="space-y-10">
      <EmptyState
        icon={
          <GraphThumbnail
            graph={SAMPLE_GRAPH}
            className="h-36 w-[min(420px,80vw)] rounded-xl border border-[var(--landing-hairline)]"
          />
        }
        title="Create your first project"
        description="A project is a canvas: drop in a document loader, wire OCR and layout models, run it, and export the result — or call it later over the API."
        actions={
          canWrite ? (
            <>
              <CreateProjectDialog />
              <Link
                href="/documentation/quick-start"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                Read the quick start
              </Link>
            </>
          ) : null
        }
      />
      <section aria-labelledby="projects-templates-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2
            id="projects-templates-heading"
            className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
          >
            Or start from a template
          </h2>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
          >
            All templates
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <TemplateQuickStart canWrite={canWrite} />
      </section>
    </div>
  );
}

export function ProjectsView({ projects, canWrite = true }: ProjectsViewProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ProjectsTab>("all");
  const [sort, setSort] = useState<ProjectsSort>("recent");
  // Persisted in localStorage; the server snapshot keeps SSR and hydration in sync.
  const view = useSyncExternalStore(
    subscribeProjectsViewMode,
    readProjectsViewMode,
    getProjectsViewModeServerSnapshot,
  );

  const visibleProjects = useMemo(
    () => sortProjects(filterProjects(projects, tab, query), sort),
    [projects, query, sort, tab],
  );

  const tabOptions = useMemo(
    () =>
      (
        [
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
        ] as const
      ).map((option) => ({
        ...option,
        count: projects.filter((project) => matchesTab(project, option.key))
          .length,
      })),
    [projects],
  );

  if (projects.length === 0) {
    return <ProjectsEmptyState canWrite={canWrite} />;
  }

  const showNewCard =
    canWrite && tab !== "archived" && query.trim() === "" && view === "cards";

  return (
    <div>
      <ListToolbar>
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search projects"
          className="w-full sm:w-auto sm:min-w-[240px] sm:flex-1 lg:max-w-sm"
        />
        <SegmentedControl
          ariaLabel="Filter projects"
          options={tabOptions}
          value={tab}
          onChange={setTab}
        />
        <div className="ml-auto flex items-center gap-2.5">
          <SortSelect options={SORT_OPTIONS} value={sort} onChange={setSort} />
          <div
            role="radiogroup"
            aria-label="Layout"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-card p-0.5"
          >
            {VIEW_OPTIONS.map((option) => {
              const active = view === option.key;
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => writeProjectsViewMode(option.key)}
                  className={cn(
                    "inline-flex h-full w-8 items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-primary/10 text-primary dark:bg-primary/25"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      </ListToolbar>

      <div className="mt-6">
        {visibleProjects.length === 0 ? (
          <EmptyState
            title={
              query.trim()
                ? `No projects match “${query.trim()}”`
                : tab === "archived"
                  ? "Nothing archived"
                  : "No projects in this view"
            }
            description={
              query.trim()
                ? "Try a different name or clear the search."
                : tab === "archived"
                  ? "Archive a project from its ⋯ menu to tuck it away without deleting it."
                  : "Switch tabs to see the rest of your projects."
            }
            actions={
              query.trim() ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:border-primary/40"
                >
                  Clear search
                </button>
              ) : null
            }
          />
        ) : view === "table" ? (
          <ProjectTable projects={visibleProjects} canWrite={canWrite} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} canWrite={canWrite} />
            ))}
            {showNewCard ? <NewProjectCard /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
