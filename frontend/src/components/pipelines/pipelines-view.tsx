"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
          Create reusable component flows, then apply them to document batches.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {canWrite ? <CreatePipelineDialog /> : null}
          <Link
            href="/templates"
            className="inline-flex h-auto items-center rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground no-underline transition-colors hover:border-primary/40"
          >
            Browse templates
          </Link>
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
            placeholder="Search pipelines…"
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

        <Select
          value={sort}
          onValueChange={(value) => setSort(value as PipelinesSort)}
        >
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

      <p className="mt-7 mb-4 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {countLabel}
      </p>

      {visiblePipelines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-8 py-14 text-center">
          <p className="text-lg font-bold tracking-tight text-foreground">
            {query.trim()
              ? `No pipelines match “${query.trim()}”`
              : "No pipelines in this view"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search, or switch tabs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visiblePipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
