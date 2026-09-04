"use client";

import { ChevronDown, Move, PanelLeft, PanelLeftClose, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { NodePaletteItem } from "@/components/canvas/node-palette-item";
import {
  PIPELINE_PALETTE_SECTION_ID,
  PipelinePaletteSection,
} from "@/components/canvas/pipeline-palette-section";
import { NodePaletteSection } from "@/components/canvas/node-palette-section";
import { ProviderLogo } from "@/components/canvas/provider-logo";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import { LogoHomeLink } from "@/components/brand/logo-home-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  filterModels,
  groupModelsByCategory,
  sortPaletteModels,
} from "@/lib/canvas/model-utils";
import { SPAWN_ONLY_MODELS } from "@/lib/canvas/page-branch-meta";
import { REGION_SPAWN_ONLY_MODELS } from "@/lib/canvas/region-branch-meta";
import { CAPTION_SPAWN_ONLY_MODELS } from "@/lib/canvas/caption-branch-meta";
import { writePaletteSectionPref } from "@/lib/canvas/palette-prefs";
import {
  providerDisplayName,
  LANGUAGE_PROVIDER_ORDER,
  REMOTE_PROVIDER_ORDER,
} from "@/lib/canvas/provider-availability";
import type { Pipeline } from "@/lib/api/client";
import { isPipelineReady } from "@/lib/api/pipelines";
import type { CategoryMeta, ModelCatalogEntry } from "@/lib/canvas/types";
import {
  CANVAS_PALETTE_COLLAPSED_WIDTH,
  CANVAS_PALETTE_WIDTH,
  canvasPaletteSectionLabelClassName,
  canvasTopBarClassName,
} from "@/lib/canvas/canvas-chrome";
import { cn } from "@/lib/utils";

const paletteIconButtonClassName =
  "shrink-0 rounded-md bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card aria-expanded:bg-transparent aria-expanded:text-muted-foreground";

const paletteTextButtonClassName =
  "rounded-md px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none";

type NodePalettePanelProps = {
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  userPipelines?: Pipeline[];
  paletteMode?: "project" | "pipeline";
  className?: string;
  showHeader?: boolean;
  showBrandBar?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsible?: boolean;
};

export function NodePalettePanel({
  models,
  categories,
  userPipelines = [],
  paletteMode = "project",
  className,
  showHeader = true,
  showBrandBar = true,
  collapsed = false,
  onCollapsedChange,
  collapsible = true,
}: NodePalettePanelProps) {
  const [query, setQuery] = useState("");
  const [showOffline, setShowOffline] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pendingSearchFocusRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearching = query.trim().length > 0;
  const { offlineProviders, runtime, getModelStatus } = useRuntimeAvailability();

  const paletteModels = useMemo(
    () =>
      models.filter(
        (model) =>
          !SPAWN_ONLY_MODELS.has(model.id) &&
          !REGION_SPAWN_ONLY_MODELS.has(model.id) &&
          !CAPTION_SPAWN_ONLY_MODELS.has(model.id),
      ),
    [models],
  );

  const visibleModels = useMemo(() => {
    if (showOffline || offlineProviders.size === 0) {
      return paletteModels;
    }
    return paletteModels.filter((model) => !getModelStatus(model).offline);
  }, [paletteModels, showOffline, offlineProviders, getModelStatus]);

  const offlineModelCount = useMemo(
    () =>
      paletteModels.filter((model) => getModelStatus(model).offline).length,
    [paletteModels, getModelStatus],
  );

  const filtered = useMemo(
    () => filterModels(visibleModels, categories, query),
    [visibleModels, categories, query],
  );

  const groups = useMemo(
    () => groupModelsByCategory(filtered, categories),
    [filtered, categories],
  );

  const flatItems = useMemo(
    () => sortPaletteModels(filtered, categories),
    [filtered, categories],
  );

  const readyPipelines = useMemo(
    () => userPipelines.filter((pipeline) => isPipelineReady(pipeline)),
    [userPipelines],
  );

  const providerStatuses = useMemo(() => {
    return REMOTE_PROVIDER_ORDER.map((provider) => {
      const entry = runtime?.providers.find((p) => p.provider === provider);
      const online = entry ? entry.running : !offlineProviders.has(provider);
      return { provider, online };
    });
  }, [runtime, offlineProviders]);

  const languageProviderStatuses = useMemo(
    () => LANGUAGE_PROVIDER_ORDER.map((provider) => {
      const entry = runtime?.providers.find((item) => item.provider === provider);
      return { provider, online: entry?.running ?? false, detail: entry?.detail };
    }),
    [runtime],
  );

  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed);
  };

  const expandAndFocusSearch = () => {
    if (collapsed) {
      pendingSearchFocusRef.current = true;
      onCollapsedChange?.(false);
      return;
    }

    searchInputRef.current?.focus();
  };

  useEffect(() => {
    if (!collapsed && pendingSearchFocusRef.current) {
      pendingSearchFocusRef.current = false;
      searchInputRef.current?.focus();
    }
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "ocrflow-palette flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-in-out",
        className,
      )}
      style={{
        width: collapsed ? CANVAS_PALETTE_COLLAPSED_WIDTH : CANVAS_PALETTE_WIDTH,
      }}
    >
      {showBrandBar ? (
        <>
          <div
            className={cn(
              canvasTopBarClassName,
              "relative justify-center",
              collapsed ? "px-1" : "px-3 md:px-4",
            )}
          >
            <LogoHomeLink
              variant={collapsed ? "mark" : "lockup"}
              logoClassName={collapsed ? "h-6 w-auto" : "h-8 w-auto"}
              ringOffsetClassName="focus-visible:ring-offset-card"
            />
            {collapsible && !collapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        paletteIconButtonClassName,
                        "absolute right-3 md:right-4",
                      )}
                      onClick={toggleCollapsed}
                      aria-controls="canvas-model-palette"
                    />
                  }
                >
                  <PanelLeftClose className="size-3.5" />
                  <span className="sr-only">Collapse model library</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Collapse model library
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {collapsible && collapsed ? (
            <div className="flex shrink-0 flex-col items-center gap-1 py-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={paletteIconButtonClassName}
                      onClick={toggleCollapsed}
                      aria-controls="canvas-model-palette"
                    />
                  }
                >
                  <PanelLeft className="size-3.5" />
                  <span className="sr-only">Expand model library</span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Expand model library
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={paletteIconButtonClassName}
                      onClick={expandAndFocusSearch}
                      aria-controls="canvas-model-palette"
                    />
                  }
                >
                  <Search className="size-3.5" />
                  <span className="sr-only">Search models</span>
                </TooltipTrigger>
                <TooltipContent side="right">Search models</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </>
      ) : null}

      {!collapsed ? (
        <>
          <div className="shrink-0 px-[18px] pt-[18px] pb-3">
            <div className="flex items-center justify-between">
              <span className={canvasPaletteSectionLabelClassName}>
                {paletteMode === "pipeline" ? "Models" : "Components"}
              </span>
              <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
                {flatItems.length}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5 transition-colors focus-within:border-[var(--pulse)]/45 focus-within:bg-muted/60">
              <Search
                className="size-[15px] shrink-0 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes…"
                className="h-auto border-none bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0"
                aria-label="Search models"
              />
            </div>
            {runtime ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setServicesOpen((value) => !value)}
                  aria-expanded={servicesOpen}
                  className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <span>OCR services <span className="ml-1 text-[8px] normal-case tracking-normal">{providerStatuses.filter((item) => item.online).length}/{providerStatuses.length} connected</span></span>
                  <ChevronDown className={cn("size-3 transition-transform", servicesOpen && "rotate-180")} />
                </button>
                {servicesOpen ? <div className="flex flex-wrap gap-1.5">
                  {providerStatuses.map(({ provider, online }) => (
                    <span
                      key={provider}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-1",
                        online
                          ? "border-[var(--status-ok)]/35 bg-[var(--status-ok)]/12"
                          : "border-border bg-muted/50",
                      )}
                      title={
                        online
                          ? `${providerDisplayName(provider)} is running`
                          : `Start the ${providerDisplayName(provider)} service`
                      }
                    >
                      <ProviderLogo
                        provider={provider}
                        size={14}
                        status={online ? "online" : "offline"}
                      />
                      <span
                        className={cn(
                          "font-mono text-[9px] tracking-[0.08em] uppercase",
                          online ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {providerDisplayName(provider)}
                      </span>
                    </span>
                  ))}
                </div> : null}
                {servicesOpen ? <>
                  <p className="pt-1 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">LLM &amp; VLM services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {languageProviderStatuses.map(({ provider, online, detail }) => (
                      <span key={provider} className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-1", online ? "border-[var(--status-ok)]/35 bg-[var(--status-ok)]/12" : "border-border bg-muted/50")} title={online ? `${providerDisplayName(provider)} has a validated connection` : detail ?? `No ${providerDisplayName(provider)} connection configured`}>
                        <ProviderLogo provider={provider} size={14} status={online ? "online" : "offline"} />
                        <span className={cn("font-mono text-[9px] tracking-[0.08em] uppercase", online ? "text-foreground" : "text-muted-foreground")}>{providerDisplayName(provider)}</span>
                      </span>
                    ))}
                  </div>
                </> : null}
                {offlineModelCount > 0 ? (
                  <button
                    type="button"
                    className={cn(paletteTextButtonClassName, "-mx-1.5")}
                    onClick={() => setShowOffline((value) => !value)}
                  >
                    {showOffline
                      ? "Hide offline models"
                      : `Show ${offlineModelCount} offline`}
                  </button>
                ) : null}
              </div>
            ) : null}
            {showHeader &&
            !isSearching &&
            (groups.length > 0 || readyPipelines.length > 0) ? (
              <div className="mt-2 flex justify-end gap-2 px-0.5">
                <button
                  type="button"
                  className={paletteTextButtonClassName}
                  onClick={() => {
                    if (readyPipelines.length > 0) {
                      writePaletteSectionPref(PIPELINE_PALETTE_SECTION_ID, true);
                    }
                    for (const group of groups) {
                      writePaletteSectionPref(group.categoryId, true);
                    }
                  }}
                >
                  Expand all
                </button>
                <button
                  type="button"
                  className={paletteTextButtonClassName}
                  onClick={() => {
                    if (readyPipelines.length > 0) {
                      writePaletteSectionPref(PIPELINE_PALETTE_SECTION_ID, false);
                    }
                    for (const group of groups) {
                      writePaletteSectionPref(group.categoryId, false);
                    }
                  }}
                >
                  Collapse all
                </button>
              </div>
            ) : null}
          </div>

          <ScrollArea
            id="canvas-model-palette"
            className="ocrflow-palette-scroll min-h-0 flex-1"
          >
            <div className="px-3 pb-4">
              {!isSearching && readyPipelines.length > 0 ? (
                <PipelinePaletteSection pipelines={readyPipelines} />
              ) : null}
              {flatItems.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {isSearching
                    ? `No models match “${query.trim()}”`
                    : offlineModelCount > 0 && !showOffline
                      ? "No online OCR models yet. Start a service or show offline models."
                      : "No models available"}
                </p>
              ) : isSearching ? (
                <ul className="flex flex-col gap-1.5">
                  {flatItems.map(({ model }) => (
                    <li key={model.id}>
                      <NodePaletteItem model={model} />
                    </li>
                  ))}
                </ul>
              ) : (
                groups.map((group, index) => (
                  <NodePaletteSection
                    key={group.categoryId}
                    group={group}
                    showTopDivider={index > 0 || readyPipelines.length > 0}
                    sectionIndex={index + (readyPipelines.length > 0 ? 1 : 0)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex shrink-0 items-center gap-2 border-t border-border/80 px-[18px] py-3 font-mono text-[10px] tracking-[0.04em] text-muted-foreground uppercase">
            <Move className="size-3.5 shrink-0" aria-hidden />
            {paletteMode === "pipeline"
              ? "Drag models to build your pipeline"
              : "Drag onto canvas to add"}
          </div>
        </>
      ) : null}
    </aside>
  );
}
