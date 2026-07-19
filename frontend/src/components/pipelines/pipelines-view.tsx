"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { CreatePipelineDialog } from "@/components/pipelines/create-pipeline-dialog";
import { PipelineCard } from "@/components/pipelines/pipeline-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pipeline } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type PipelinesViewProps = {
  pipelines: Pipeline[];
  canWrite?: boolean;
};

type PipelinesTab = "all" | "ready" | "archived";
type PipelinesSort = "recent" | "name-asc" | "name-desc";

const TAB_OPTIONS: { key: PipelinesTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "archived", label: "Archived" },
];

const SORT_OPTIONS: { key: PipelinesSort; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
];

function isReadyPipeline(pipeline: Pipeline): boolean {
  return (
    Boolean(pipeline.input_wire_kind) &&
    Boolean(pipeline.output_wire_kind) &&
    Array.isArray(pipeline.graph.nodes) &&
    pipeline.graph.nodes.length > 0
  );
}

function filterPipelines(
  pipelines: Pipeline[],
  tab: PipelinesTab,
  query: string,
): Pipeline[] {
  const normalizedQuery = query.trim().toLowerCase();

  return pipelines.filter((pipeline) => {
    if (tab === "all" && pipeline.is_archived) return false;
    if (tab === "ready" && (!isReadyPipeline(pipeline) || pipeline.is_archived))
      return false;
    if (tab === "archived" && !pipeline.is_archived) return false;

    if (!normalizedQuery) return true;

    const description = pipeline.description?.toLowerCase() ?? "";
    return (
      pipeline.name.toLowerCase().includes(normalizedQuery) ||
      description.includes(normalizedQuery)
    );
  });
}

function sortPipelines(
  pipelines: Pipeline[],
  sort: PipelinesSort,
): Pipeline[] {
  const sorted = [...pipelines];

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

export function PipelinesView({
  pipelines,
  canWrite = true,
}: PipelinesViewProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PipelinesTab>("all");
  const [sort, setSort] = useState<PipelinesSort>("recent");

  const visiblePipelines = useMemo(
    () => sortPipelines(filterPipelines(pipelines, tab, query), sort),
    [pipelines, query, sort, tab],
  );

  const countLabel = `${visiblePipelines.length} PIPELINE${visiblePipelines.length === 1 ? "" : "S"}`;

  if (pipelines.length === 0) {
    return (
      <div className="mt-9 rounded-xl border border-dashed border-border px-8 py-14 text-center">
        <p className="text-lg font-bold tracking-tight text-foreground">
          No pipelines yet
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create reusable component flows to use inside your projects.
        </p>
        <div className="mt-6 flex justify-center">
          {canWrite ? <CreatePipelineDialog /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {TAB_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === option.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[220px]">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pipelines"
              className="h-10 pl-9"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as PipelinesSort)}
          >
            <SelectTrigger className="h-10 w-full sm:w-[140px]">
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
      </div>

      <p className="mt-5 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {countLabel}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visiblePipelines.map((pipeline) => (
          <PipelineCard
            key={pipeline.id}
            pipeline={pipeline}
            canWrite={canWrite}
          />
        ))}
      </div>

      {visiblePipelines.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No pipelines match your filters.
        </p>
      ) : null}
    </div>
  );
}
