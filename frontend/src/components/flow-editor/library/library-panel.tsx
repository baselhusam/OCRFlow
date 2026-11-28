"use client";

import { ChevronDown, ChevronLeft, Search, SearchX, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";

import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import { useOcrCatalog } from "@/hooks/use-ocr-catalog";
import {
  formatOcrModelPrice,
  shortOcrModelName,
  type OcrCatalogConnection,
} from "@/lib/api/model-connections";
import { isOpenRouterOcrModel } from "@/lib/canvas/connected-node-meta";
import { VendorMark } from "@/components/configuration/vendor-mark";
import { vendorKey, vendorLabel } from "@/lib/openrouter-vendors";
import type { Pipeline } from "@/lib/api/client";
import { getPipelineLogoUrl, isPipelineReady } from "@/lib/api/pipelines";
import { CAPTION_SPAWN_ONLY_MODELS } from "@/lib/canvas/caption-branch-meta";
import { getCategoryColor } from "@/lib/canvas/category-meta";
import {
  formatComputeTier,
  getModelDescription,
  getModelLabel,
  getModelWireTypes,
} from "@/lib/canvas/model-utils";
import { SPAWN_ONLY_MODELS } from "@/lib/canvas/page-branch-meta";
import {
  requestPaletteAdd,
  requestPaletteAddPipeline,
} from "@/lib/canvas/palette-add-bridge";
import { REGION_SPAWN_ONLY_MODELS } from "@/lib/canvas/region-branch-meta";
import {
  DRAG_MODEL_MIME,
  DRAG_PIPELINE_MIME,
  type CategoryMeta,
  type ModelCatalogEntry,
} from "@/lib/canvas/types";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { formatPipelineIO, formatPipelineMeta, getPipelineStats } from "@/lib/pipelines/stats";
import { cn } from "@/lib/utils";

import { EngineMark } from "./engine-mark";
import { EngineStrip, type EngineSummary } from "./engine-strip";
import {
  BUILTIN_ENGINE,
  categoryLabelMap,
  engineDisplayName,
  engineFix,
  engineForProvider,
  engineKind,
  engineRank,
  groupLibraryItems,
  humanizeCategory,
  LIBRARY_SECTIONS,
  modelMatchesQuery,
  normalizeQuery,
  pipelineMatchesQuery,
  type LibraryModelItem,
  type LibraryPreset,
  type LibrarySectionMeta,
} from "./library-data";
import { useSectionFolds } from "./library-prefs";
import { Highlight, LibraryRow, ModelInfo, PipelineInfo, StatusDot } from "./library-row";
import styles from "./library.module.css";

export const LIBRARY_PANEL_WIDTH = 288;

export type LibraryPanelProps = {
  /** Catalog entries, already filtered to `status === "done"`. */
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  paletteMode: "project" | "pipeline";
  /** The user's saved pipelines (project mode only). */
  userPipelines?: Pipeline[];
  /** The user's default OCR model — starred and sorted first in its section. */
  preferredModelId?: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

const LIST_ID = "ocrflow-library-list";

/** Cloud OCR rows shown before "Show all" (search and the engine chip show every model). */
const CLOUD_OCR_PREVIEW = 8;

function formatContext(tokens: number | null): string | null {
  if (!tokens) return null;
  return tokens >= 1000 ? `${Math.round(tokens / 1000)}K tokens` : `${tokens} tokens`;
}

/** One library preset per OCR model on each validated OpenRouter connection. */
function cloudOcrPresets(
  connections: OcrCatalogConnection[],
): Array<{ key: string; label: string; rank: number; preset: LibraryPreset }> {
  const openrouter = connections.filter((connection) => connection.protocol === "openrouter");
  const multiple = openrouter.length > 1;
  const rows: Array<{ key: string; label: string; rank: number; preset: LibraryPreset }> = [];
  for (const connection of openrouter) {
    connection.models.forEach((model, index) => {
      const vendor = vendorLabel(vendorKey(model.id), model.name);
      const price = formatOcrModelPrice(model);
      const context = formatContext(model.context_length);
      const meta = [vendor, model.free ? "free" : null, multiple ? connection.connection_name : null]
        .filter(Boolean)
        .join(" · ");
      rows.push({
        key: `openrouter/ocr:${connection.connection_id}:${model.id}`,
        label: shortOcrModelName(model.name),
        rank: index,
        preset: {
          params: {
            connection_id: connection.connection_id,
            model: model.id,
            model_label: model.name,
          },
          modelId: model.id,
          description:
            model.description ??
            "Hosted vision model on OpenRouter. Reads one page image and returns markdown.",
          meta,
          details: [
            ...(price ? [{ label: "price", value: price }] : []),
            ...(context ? [{ label: "context", value: context }] : []),
            { label: "via", value: connection.connection_name },
            ...(model.document_focused ? [{ label: "fit", value: "described for documents" }] : []),
          ],
          searchText: [model.name, model.id, vendor, model.description ?? "", "ocr cloud openrouter"]
            .join("\n")
            .toLowerCase(),
        },
      });
    });
  }
  return rows;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function LibraryPanel({
  models,
  categories,
  paletteMode,
  userPipelines = [],
  preferredModelId = null,
  collapsed,
  onCollapsedChange,
}: LibraryPanelProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [engineFilter, setEngineFilter] = useState<string | null>(null);
  const [onlyOnlinePref, setOnlyOnlinePref] = useState<boolean | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef(false);
  const { runtime, getModelStatus } = useRuntimeAvailability();
  const { isFolded, toggleFold } = useSectionFolds();
  const ocrCatalog = useOcrCatalog();
  const [showAllCloudOcr, setShowAllCloudOcr] = useState(false);

  const q = normalizeQuery(query);
  const isSearching = q.length > 0;

  /* ---------------------------------------------------------------- data */

  const labels = useMemo(() => categoryLabelMap(categories), [categories]);

  const presets = useMemo(() => cloudOcrPresets(ocrCatalog.connections), [ocrCatalog.connections]);

  const items = useMemo<LibraryModelItem[]>(
    () =>
      models
        .filter(
          (model) =>
            !SPAWN_ONLY_MODELS.has(model.id) &&
            !REGION_SPAWN_ONLY_MODELS.has(model.id) &&
            !CAPTION_SPAWN_ONLY_MODELS.has(model.id),
        )
        .flatMap((model): LibraryModelItem[] => {
          const status = getModelStatus(model);
          const base: LibraryModelItem = {
            model,
            label: getModelLabel(model),
            categoryLabel: labels.get(model.category) ?? humanizeCategory(model.category),
            engine: engineForProvider(model.provider),
            offline: status.offline,
            offlineMessage: status.message,
            preferred: model.id === preferredModelId,
          };
          if (!isOpenRouterOcrModel(model.id)) return [base];
          // Until a connection lists models, keep the bare node so users can
          // discover it (offline, with a "connect in Configuration" fix).
          if (presets.length === 0) return [{ ...base, section: "cloud_ocr" }];
          return presets.map((row) => ({
            ...base,
            key: row.key,
            label: row.label,
            rank: row.rank,
            section: "cloud_ocr",
            preset: row.preset,
          }));
        }),
    [models, labels, getModelStatus, preferredModelId, presets],
  );

  const engines = useMemo<EngineSummary[]>(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.engine, (counts.get(item.engine) ?? 0) + 1);
    return [...counts.entries()]
      .map(([engine, count]) => ({
        engine,
        count,
        online:
          engineKind(engine) === "builtin" ||
          (runtime?.providers.find((entry) => entry.provider === engine)?.running ?? false),
      }))
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return engineRank(a.engine) - engineRank(b.engine);
      });
  }, [items, runtime]);

  // Default ON when anything is runnable, so users aren't shown dozens of
  // nodes they can't execute; an explicit toggle always wins.
  const anyOnline = items.some((item) => !item.offline);
  const onlyOnline = onlyOnlinePref ?? anyOnline;
  // Picking an engine is an explicit ask to see its nodes, offline or not.
  const applyOnlineFilter = onlyOnline && !engineFilter;

  const matched = useMemo(
    () =>
      items.filter(
        (item) =>
          (!engineFilter || item.engine === engineFilter) &&
          (item.preset
            ? !q || item.preset.searchText.includes(q)
            : modelMatchesQuery(item.model, item.categoryLabel, q)),
      ),
    [items, engineFilter, q],
  );

  const visible = useMemo(
    () => (applyOnlineFilter ? matched.filter((item) => !item.offline) : matched),
    [matched, applyOnlineFilter],
  );
  const hiddenOffline = matched.length - visible.length;
  const shownOffline = visible.filter((item) => item.offline).length;

  const groups = useMemo(() => groupLibraryItems(visible), [visible]);

  const readyPipelines = useMemo(
    () =>
      paletteMode === "project"
        ? userPipelines.filter((pipeline) => isPipelineReady(pipeline))
        : [],
    [paletteMode, userPipelines],
  );
  const visiblePipelines = useMemo(
    () =>
      engineFilter ? [] : readyPipelines.filter((pipeline) => pipelineMatchesQuery(pipeline, q)),
    [readyPipelines, engineFilter, q],
  );

  const totalCount = items.length + readyPipelines.length;
  const shownCount = visible.length + visiblePipelines.length;

  /* ------------------------------------------------------------ actions */

  const clearSearch = useCallback(() => {
    setQuery("");
    searchRef.current?.focus();
  }, []);

  const focusSearch = useCallback(() => {
    if (collapsed) {
      pendingFocusRef.current = true;
      onCollapsedChange(false);
      return;
    }
    searchRef.current?.focus();
    searchRef.current?.select();
  }, [collapsed, onCollapsedChange]);

  useEffect(() => {
    if (!collapsed && pendingFocusRef.current) {
      pendingFocusRef.current = false;
      searchRef.current?.focus();
    }
  }, [collapsed]);

  // "/" focuses library search (⌘K belongs to the global command palette).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      event.preventDefault();
      focusSearch();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearch]);

  const rows = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-library-row]") ?? []);

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const all = rows();
    if (all.length === 0) return;
    const index = all.indexOf(document.activeElement as HTMLElement);
    let next = index;
    if (event.key === "ArrowDown") next = Math.min(all.length - 1, index + 1);
    if (event.key === "ArrowUp") {
      if (index <= 0) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      next = index - 1;
    }
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = all.length - 1;
    event.preventDefault();
    all[next]?.focus();
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) setQuery("");
      else searchRef.current?.blur();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      rows()[0]?.focus();
    } else if (event.key === "Enter" && isSearching) {
      event.preventDefault();
      rows()[0]?.click();
    }
  };

  /* ------------------------------------------------------------- render */

  const renderModelRow = (item: LibraryModelItem) => {
    const { model, preset } = item;
    const wire = getModelWireTypes(model);
    const engineName = engineDisplayName(item.engine);
    const providerName =
      item.engine === BUILTIN_ENGINE ? "ocrflow" : model.provider;
    const metaText = preset ? preset.meta : item.categoryLabel.toLowerCase();
    return (
      <li key={item.key ?? model.id}>
        <LibraryRow
          name={item.label}
          preferred={item.preferred}
          offline={item.offline}
          tile={
            preset ? (
              <VendorMark vendor={preset.modelId} size={30} dimmed={item.offline} />
            ) : (
              <EngineMark provider={model.provider} size={30} dimmed={item.offline} />
            )
          }
          title={<Highlight text={item.label} query={q} />}
          meta={
            <>
              <StatusDot online={!item.offline} />
              <span className="truncate">
                {preset ? null : (
                  <>
                    <Highlight text={providerName} query={q} />
                    <span className="text-[var(--lib-ink-faint)]"> · </span>
                  </>
                )}
                <Highlight text={metaText} query={q} />
              </span>
            </>
          }
          onAdd={() => requestPaletteAdd(model.id, preset?.params)}
          onDragStart={(event) => {
            event.dataTransfer.setData(
              DRAG_MODEL_MIME,
              JSON.stringify({ type: "model", modelId: model.id, params: preset?.params }),
            );
            event.dataTransfer.effectAllowed = "move";
          }}
          info={
            <ModelInfo
              tile={
                preset ? <VendorMark vendor={preset.modelId} size={34} /> : <EngineMark provider={model.provider} size={34} />
              }
              name={item.label}
              modelId={preset ? preset.modelId : model.id}
              description={preset ? preset.description : getModelDescription(model)}
              details={preset?.details}
              engineName={engineName}
              categoryLabel={item.categoryLabel}
              accent={getCategoryColor(model.category)}
              input={formatWireLabel(wire.input)}
              output={formatWireLabel(wire.output)}
              compute={formatComputeTier(model.compute)}
              offline={item.offline}
              offlineMessage={item.offlineMessage}
              fix={engineFix(item.engine)}
            />
          }
        />
      </li>
    );
  };

  const renderPipelineRow = (pipeline: Pipeline) => {
    const stats = formatPipelineMeta(getPipelineStats(pipeline));
    const io = formatPipelineIO(pipeline);
    const tile = (size: number) =>
      pipeline.has_logo ? (
        <span
          className="inline-flex shrink-0 overflow-hidden bg-white shadow-[0_0_0_1px_rgba(20,18,37,0.08)]"
          style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
        >
          <Image
            src={getPipelineLogoUrl(pipeline.id)}
            alt=""
            width={size}
            height={size}
            className="size-full object-cover"
            unoptimized
          />
        </span>
      ) : (
        <EngineMark provider={BUILTIN_ENGINE} size={size} />
      );
    return (
      <li key={pipeline.id}>
        <LibraryRow
          name={pipeline.name}
          tile={tile(30)}
          title={<Highlight text={pipeline.name} query={q} />}
          meta={
            <>
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: pipeline.accent_color || "var(--primary)" }}
                aria-hidden
              />
              <span className="truncate">
                pipeline<span className="text-[var(--lib-ink-faint)]"> · </span>
                {io ?? stats.nodes}
              </span>
            </>
          }
          onAdd={() => requestPaletteAddPipeline(pipeline.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData(
              DRAG_PIPELINE_MIME,
              JSON.stringify({ type: "pipeline", pipelineId: pipeline.id }),
            );
            event.dataTransfer.effectAllowed = "move";
          }}
          info={
            <PipelineInfo
              tile={tile(34)}
              name={pipeline.name}
              description={pipeline.description}
              io={io}
              stats={`${stats.nodes} · ${stats.models}`}
            />
          }
        />
      </li>
    );
  };

  const sections: Array<{ section: LibrarySectionMeta; count: number; rows: JSX.Element[] }> = [];
  for (const meta of LIBRARY_SECTIONS) {
    if (meta.id === "pipelines") {
      if (visiblePipelines.length > 0) {
        sections.push({
          section: meta,
          count: visiblePipelines.length,
          rows: visiblePipelines.map(renderPipelineRow),
        });
      }
      continue;
    }
    const group = groups.find((entry) => entry.section.id === meta.id);
    if (group) {
      // Hundreds of hosted models: preview the best fits, search shows all.
      const capped =
        meta.id === "cloud_ocr" &&
        !isSearching &&
        !engineFilter &&
        !showAllCloudOcr &&
        group.items.length > CLOUD_OCR_PREVIEW + 2;
      const shown = capped ? group.items.slice(0, CLOUD_OCR_PREVIEW) : group.items;
      const rows = shown.map(renderModelRow);
      if (meta.id === "cloud_ocr" && group.items.length > CLOUD_OCR_PREVIEW + 2 && !isSearching && !engineFilter) {
        rows.push(
          <li key="cloud-ocr-toggle">
            <button
              type="button"
              onClick={() => setShowAllCloudOcr((value) => !value)}
              className="my-1 flex h-8 w-full items-center justify-center rounded-md font-mono text-[10.5px] text-[var(--lib-accent-ink)] transition-colors hover:bg-[var(--lib-row-hover)] focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none"
            >
              {capped
                ? `Show all ${group.items.length} OpenRouter models`
                : "Show fewer"}
            </button>
          </li>,
        );
      }
      sections.push({
        section: meta,
        count: group.items.length,
        rows,
      });
    }
  }

  const otherEmpty = (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-[var(--lib-hair)] bg-[var(--lib-raised)] text-[var(--lib-ink-soft)]">
        <SearchX className="size-[18px]" aria-hidden />
      </span>
      <p className="text-[13px] font-medium text-foreground">
        {isSearching ? (
          <>
            Nothing matches <span className="text-[var(--lib-accent-ink)]">“{query.trim()}”</span>
          </>
        ) : (
          "No nodes to show"
        )}
      </p>
      <p className="mt-1 font-mono text-[10px] leading-4 text-[var(--lib-ink-soft)]">
        {engineFilter
          ? `in ${engineDisplayName(engineFilter)}`
          : hiddenOffline > 0
            ? `${hiddenOffline} offline ${hiddenOffline === 1 ? "match is" : "matches are"} hidden`
            : "try a provider, task or wire type"}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {isSearching ? (
          <button
            type="button"
            onClick={clearSearch}
            className="h-7 rounded-md border border-[var(--lib-hair-strong)] bg-[var(--lib-raised)] px-3 text-[12px] font-medium text-foreground transition-colors hover:border-[var(--pulse)]/50 focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none"
          >
            Clear search
          </button>
        ) : null}
        {engineFilter ? (
          <button
            type="button"
            onClick={() => setEngineFilter(null)}
            className="h-7 rounded-md px-3 text-[12px] font-medium text-[var(--lib-accent-ink)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none"
          >
            All engines
          </button>
        ) : hiddenOffline > 0 ? (
          <button
            type="button"
            onClick={() => setOnlyOnlinePref(false)}
            className="h-7 rounded-md px-3 text-[12px] font-medium text-[var(--lib-accent-ink)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none"
          >
            Show offline
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        styles.root,
        "relative z-20 h-full shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
      )}
      style={{ width: collapsed ? 0 : LIBRARY_PANEL_WIDTH }}
    >
      <div className="h-full w-full overflow-hidden">
        <aside
          aria-label="Node library"
          inert={collapsed}
          className="flex h-full flex-col border-r border-[var(--lib-hair)] bg-[var(--lib-bg)]"
          style={{ width: LIBRARY_PANEL_WIDTH }}
        >
          {/* 1 · header + 2 · search + 3 · engines */}
          <div className={cn(styles.glow, "shrink-0 space-y-3 px-4 pt-4 pb-3")}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Library
              </h2>
              <span className="font-mono text-[10.5px] tabular-nums text-[var(--lib-ink-soft)]">
                {shownCount !== totalCount ? (
                  <>
                    <span className="text-foreground">{shownCount}</span>
                    <span className="text-[var(--lib-ink-faint)]"> / {totalCount}</span>
                  </>
                ) : (
                  <>
                    {totalCount} <span className="text-[var(--lib-ink-faint)]">nodes</span>
                  </>
                )}
              </span>
            </div>

            <div
              className={cn(
                "group/search flex h-10 items-center gap-2 rounded-[10px] border border-[var(--lib-hair-strong)] bg-[var(--lib-raised)] px-3",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow,background-color]",
                "focus-within:border-[var(--pulse)] focus-within:bg-[var(--lib-raised-focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pulse)_22%,transparent)]",
              )}
            >
              <Search
                className="size-4 shrink-0 text-[var(--lib-ink-faint)] transition-colors group-focus-within/search:text-[var(--lib-accent-ink)]"
                aria-hidden
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search nodes, engines, tasks"
                aria-label="Search the node library"
                aria-controls={LIST_ID}
                spellCheck={false}
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-[var(--lib-ink-faint)]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--lib-ink-soft)] transition-colors hover:bg-[var(--lib-row-hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <kbd className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-[var(--lib-hair-strong)] bg-[var(--lib-bg)] px-1 font-mono text-[10.5px] text-[var(--lib-ink-soft)] shadow-[0_1px_0_var(--lib-hair-strong)]">
                  /
                </kbd>
              )}
            </div>

            {engines.length > 0 ? (
              <EngineStrip
                engines={engines}
                selected={engineFilter}
                onSelect={setEngineFilter}
                onlyOnline={onlyOnline}
                onOnlyOnlineChange={setOnlyOnlinePref}
                hiddenOffline={applyOnlineFilter ? hiddenOffline : 0}
                shownOffline={shownOffline}
              />
            ) : null}
          </div>

          {/* 4 · sections + 5 · rows */}
          <div
            ref={listRef}
            id={LIST_ID}
            onKeyDown={onListKeyDown}
            className={cn(
              styles.scroll,
              "min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--lib-hair)] pb-3",
            )}
          >
            {sections.length === 0
              ? otherEmpty
              : sections.map(({ section, count, rows: sectionRows }) => {
                  const folded = !isSearching && isFolded(section.id);
                  const Icon = section.icon;
                  const bodyId = `${LIST_ID}-${section.id}`;
                  return (
                    <section key={section.id} aria-label={section.label}>
                      <h3 className="sticky top-0 z-10 bg-[var(--lib-bg)] px-2 pt-2 pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSearching) toggleFold(section.id);
                          }}
                          aria-expanded={!folded}
                          aria-controls={bodyId}
                          aria-disabled={isSearching || undefined}
                          className={cn(
                            "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left transition-colors",
                            "focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none",
                            !isSearching && "hover:bg-[var(--lib-row-hover)]",
                          )}
                        >
                          <span
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded-[6px]"
                            style={{
                              color: section.accent,
                              backgroundColor: `color-mix(in srgb, ${section.accent} 14%, transparent)`,
                              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${section.accent} 22%, transparent)`,
                            }}
                            aria-hidden
                          >
                            <Icon className="size-3" strokeWidth={2.25} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-[0.005em] text-foreground/90">
                            {section.label}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-[var(--lib-ink-faint)]">
                            {count}
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-3.5 shrink-0 text-[var(--lib-ink-faint)] transition-transform duration-200",
                              folded && "-rotate-90",
                              isSearching && "opacity-0",
                            )}
                            aria-hidden
                          />
                        </button>
                      </h3>
                      <div
                        id={bodyId}
                        inert={folded}
                        className={cn(
                          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                          folded ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                        )}
                      >
                        <ul className="min-h-0 overflow-hidden px-2">{sectionRows}</ul>
                      </div>
                    </section>
                  );
                })}
          </div>

          {/* 6 · footer */}
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-t border-[var(--lib-hair)] px-4 font-mono text-[10px] text-[var(--lib-ink-faint)]">
            <span>Click or drag to add</span>
            <span aria-hidden>·</span>
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border border-[var(--lib-hair-strong)] px-0.5 text-[9.5px] text-[var(--lib-ink-soft)]">
              /
            </kbd>
            <span>to search</span>
          </div>
        </aside>
      </div>

      {/* Collapse tab — stays on the panel's inner edge, even when collapsed. */}
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Open node library" : "Collapse node library"}
        title={collapsed ? "Open library" : "Collapse library"}
        className={cn(
          "absolute top-1/2 left-full z-30 flex h-[52px] w-4 -translate-y-1/2 items-center justify-center",
          "rounded-r-md border border-l-0 border-[var(--lib-hair-strong)] bg-[var(--lib-bg)] text-[var(--lib-ink-soft)]",
          "opacity-55 shadow-[2px_0_8px_-4px_rgba(20,18,37,0.25)] transition-[opacity,color,background-color]",
          "hover:bg-[var(--lib-raised)] hover:text-[var(--lib-accent-ink)] hover:opacity-100",
          "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none",
        )}
      >
        <ChevronLeft
          className={cn("size-3.5 transition-transform duration-300", collapsed && "rotate-180")}
          aria-hidden
        />
      </button>
    </div>
  );
}
