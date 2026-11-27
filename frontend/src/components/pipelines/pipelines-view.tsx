"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";

import {
  EmptyState,
  ListSearch,
  ListToolbar,
  SegmentedControl,
  SortSelect,
} from "@/components/app/list-toolbar";
import { CreatePipelineDialog } from "@/components/pipelines/create-pipeline-dialog";
import { PipelineCard } from "@/components/pipelines/pipeline-card";
import { TemplateQuickStart } from "@/components/templates/template-quick-start";
import type { Pipeline } from "@/lib/api/client";

type PipelinesViewProps = {
  pipelines: Pipeline[];
  canWrite?: boolean;
};

type PipelinesTab = "all" | "ready" | "archived";
type PipelinesSort = "recent" | "name-asc" | "name-desc";

const SORT_OPTIONS: { key: PipelinesSort; label: string }[] = [
  { key: "recent", label: "Last updated" },
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

function matchesTab(pipeline: Pipeline, tab: PipelinesTab): boolean {
  if (tab === "all") return !pipeline.is_archived;
  if (tab === "ready") return !pipeline.is_archived && isReadyPipeline(pipeline);
  return pipeline.is_archived;
}

function filterPipelines(
  pipelines: Pipeline[],
  tab: PipelinesTab,
  query: string,
): Pipeline[] {
  const normalizedQuery = query.trim().toLowerCase();

  return pipelines.filter((pipeline) => {
    if (!matchesTab(pipeline, tab)) return false;

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

  const tabOptions = useMemo(
    () =>
      (
        [
          { key: "all", label: "All" },
          { key: "ready", label: "Ready" },
          { key: "archived", label: "Archived" },
        ] as const
      ).map((option) => ({
        ...option,
        count: pipelines.filter((pipeline) => matchesTab(pipeline, option.key))
          .length,
      })),
    [pipelines],
  );

  if (pipelines.length === 0) {
    return (
      <div className="space-y-10">
        <EmptyState
          icon={
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GitBranch className="size-6" aria-hidden />
            </span>
          }
          title="No pipelines yet"
          description="A pipeline is a reusable flow with one input and one output. Build one from scratch, save part of a project canvas, or clone a template — then apply it to whole batches from Jobs."
          actions={canWrite ? <CreatePipelineDialog /> : null}
        />
        <section aria-labelledby="pipelines-templates-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2
              id="pipelines-templates-heading"
              className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
            >
              Start from a template
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

  return (
    <div>
      <ListToolbar>
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search pipelines"
          className="w-full sm:w-auto sm:min-w-[240px] sm:flex-1 lg:max-w-sm"
        />
        <SegmentedControl
          ariaLabel="Filter pipelines"
          options={tabOptions}
          value={tab}
          onChange={setTab}
        />
        <div className="ml-auto">
          <SortSelect options={SORT_OPTIONS} value={sort} onChange={setSort} />
        </div>
      </ListToolbar>

      <div className="mt-6">
        {visiblePipelines.length === 0 ? (
          <EmptyState
            title={
              query.trim()
                ? `No pipelines match “${query.trim()}”`
                : tab === "ready"
                  ? "No ready pipelines yet"
                  : tab === "archived"
                    ? "Nothing archived"
                    : "No pipelines in this view"
            }
            description={
              query.trim()
                ? "Try a different name or clear the search."
                : tab === "ready"
                  ? "A pipeline is ready once its canvas has components and a single input and output. Open a draft to finish it."
                  : "Switch tabs to see the rest of your pipelines."
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
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
