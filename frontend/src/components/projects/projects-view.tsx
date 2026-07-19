"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/lib/api/client";
import { isActiveProject } from "@/lib/projects/status";
import { cn } from "@/lib/utils";

type ProjectsViewProps = {
  projects: Project[];
  canWrite?: boolean;
};

type ProjectsTab = "all" | "active" | "archived";
type ProjectsSort = "recent" | "name-asc" | "name-desc";

const TAB_OPTIONS: { key: ProjectsTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

const SORT_OPTIONS: { key: ProjectsSort; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
];

function filterProjects(
  projects: Project[],
  tab: ProjectsTab,
  query: string,
): Project[] {
  const normalizedQuery = query.trim().toLowerCase();

  return projects.filter((project) => {
    if (tab === "all" && project.is_archived) return false;
    if (tab === "active" && !isActiveProject(project)) return false;
    if (tab === "archived" && !project.is_archived) return false;

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

export function ProjectsView({ projects, canWrite = true }: ProjectsViewProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ProjectsTab>("all");
  const [sort, setSort] = useState<ProjectsSort>("recent");

  const visibleProjects = useMemo(
    () => sortProjects(filterProjects(projects, tab, query), sort),
    [projects, query, sort, tab],
  );

  const countLabel = `${visibleProjects.length} PROJECT${visibleProjects.length === 1 ? "" : "S"}`;

  if (projects.length === 0) {
    return (
      <div className="mt-9 rounded-xl border border-dashed border-border px-8 py-14 text-center">
        <p className="text-lg font-bold tracking-tight text-foreground">
          No projects yet
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first project to open an empty canvas.
        </p>
        <div className="mt-6 flex justify-center">
          {canWrite ? <CreateProjectDialog /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-9">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="inline-flex rounded-lg bg-secondary/80 p-0.5">
          {TAB_OPTIONS.map((option) => {
            const active = tab === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setTab(option.key)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <Select value={sort} onValueChange={(value) => setSort(value as ProjectsSort)}>
          <SelectTrigger className="ml-auto h-10 min-w-[120px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mt-7 mb-4 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
        {countLabel}
      </p>

      {visibleProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-8 py-14 text-center">
          <p className="text-lg font-bold tracking-tight text-foreground">
            {query.trim()
              ? `No projects match “${query.trim()}”`
              : "No projects in this view"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search, or switch tabs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} canWrite={canWrite} />
          ))}
        </div>
      )}
    </div>
  );
}
