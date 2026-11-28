"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { refreshOcrCatalog } from "@/hooks/use-ocr-catalog";
import {
  formatOcrModelPrice,
  shortOcrModelName,
  type ModelConnection,
  type OcrModel,
} from "@/lib/api/model-connections";
import { groupByVendor } from "@/lib/openrouter-vendors";
import { cn } from "@/lib/utils";

import { VendorMark } from "./vendor-mark";

type Filter = "all" | "enabled" | "documents" | "free";
type SaveState = "idle" | "saving" | "saved" | "error";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "enabled", label: "On canvas" },
  { id: "documents", label: "For documents" },
  { id: "free", label: "Free" },
];

const SAVE_DELAY_MS = 500;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { detail?: string }).detail ?? fallback);
  return body as T;
}

/** Choose which OpenRouter models appear as OCR nodes on the canvas. */
export function OpenRouterModelsManager({ connectionId }: { connectionId: string }) {
  const [connection, setConnection] = useState<ModelConnection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const saveTimer = useRef<number | null>(null);
  const pending = useRef<string[] | null>(null);

  const adopt = useCallback((next: ModelConnection) => {
    setConnection(next);
    setEnabled(new Set(next.enabled_models));
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/configuration/model-connections/${connectionId}`, { cache: "no-store" })
      .then((response) => readJson<ModelConnection>(response, "Could not load this connection"))
      .then((next) => { if (active) adopt(next); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load this connection"); });
    return () => { active = false; };
  }, [connectionId, adopt]);

  const persist = useCallback(async (body: { enabled_models: string[] | null }) => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const response = await fetch(`/api/configuration/model-connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const next = await readJson<ModelConnection>(response, "Could not save");
      setConnection(next);
      if (body.enabled_models === null) setEnabled(new Set(next.enabled_models));
      setSaveState("saved");
      void refreshOcrCatalog(true);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Could not save");
    }
  }, [connectionId]);

  // Debounce bursts of toggles into one save; flush on unmount.
  const commit = useCallback((next: Set<string>) => {
    setEnabled(next);
    pending.current = [...next];
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const ids = pending.current;
      pending.current = null;
      if (ids) void persist({ enabled_models: ids });
    }, SAVE_DELAY_MS);
  }, [persist]);

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (pending.current) {
      void fetch(`/api/configuration/model-connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_models: pending.current }),
        keepalive: true,
      });
    }
  }, [connectionId]);

  const models = useMemo<OcrModel[]>(() => connection?.last_validation?.ocr_models ?? [], [connection]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((model) => {
      if (filter === "enabled" && !enabled.has(model.id)) return false;
      if (filter === "documents" && !model.document_focused) return false;
      if (filter === "free" && !model.free) return false;
      return !q || `${model.name}\n${model.id}`.toLowerCase().includes(q);
    });
  }, [models, query, filter, enabled]);

  const groups = useMemo(() => groupByVendor(visible), [visible]);
  const narrowed = visible.length !== models.length;
  const visibleOn = visible.filter((model) => enabled.has(model.id)).length;

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(enabled);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    commit(next);
  };

  const revalidate = async () => {
    setRevalidating(true);
    try {
      const response = await fetch(`/api/configuration/model-connections/${connectionId}/validate`, { method: "POST" });
      adopt(await readJson<ModelConnection>(response, "Validation failed"));
      void refreshOcrCatalog(true);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setRevalidating(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="size-4" /> {loadError}
        </div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" /> Loading OpenRouter models…
      </div>
    );
  }

  const status = connection.last_validation?.status ?? "unreachable";
  const total = models.length;

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <ProviderLogo provider="openrouter" size={28} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">OpenRouter models</p>
            <h1 className="mt-1 truncate text-[28px] leading-[1.08] font-extrabold tracking-[-0.03em]">{connection.name}</h1>
            <p className="mt-2 max-w-[620px] text-[15px] leading-relaxed text-muted-foreground">
              Pick the models that show up as OCR nodes in the canvas library. Everything else stays hidden.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <SaveIndicator state={saveState} error={saveError} />
          <Button variant="outline" onClick={() => void revalidate()} disabled={revalidating}>
            {revalidating ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Refresh list
          </Button>
        </div>
      </header>

      {status !== "ready" ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {connection.last_validation?.detail ?? "This connection is not validated."} Nothing from it appears on the canvas until it validates.
        </div>
      ) : null}

      {/* Summary + toolbar */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_40px_rgba(31,20,76,0.05)]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border px-5 py-4">
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-semibold">
              <span className="text-primary tabular-nums">{enabled.size}</span>
              <span className="text-muted-foreground"> of {total} models on the canvas</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${total ? (enabled.size / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMany(visible.map((model) => model.id), true)} disabled={visibleOn === visible.length}>
              <Check /> {narrowed ? `Enable ${visible.length} shown` : "Enable all"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMany(visible.map((model) => model.id), false)} disabled={visibleOn === 0}>
              <X /> {narrowed ? `Disable ${visible.length} shown` : "Disable all"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void persist({ enabled_models: null })} title="Enable only the models described for documents">
              <RotateCcw /> Recommended
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models or vendors"
              aria-label="Search OpenRouter models"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
          <div role="tablist" aria-label="Filter models" className="flex rounded-lg bg-muted p-0.5">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                  filter === option.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor groups */}
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No models match. Try another search or filter.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const ids = group.models.map((model) => model.id);
            const onCount = ids.filter((id) => enabled.has(id)).length;
            const allOn = onCount === ids.length;
            // Collapsed by default so 40 vendors fit on one screen; search and filters open them.
            const open = openGroups[group.key] ?? (query.trim() !== "" || filter !== "all");
            return (
              <section key={group.key} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((value) => ({ ...value, [group.key]: !open }))}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <VendorMark vendor={group.key} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{group.label}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {onCount > 0 ? <span className="text-primary">{onCount} on</span> : "none on"} · {ids.length} model{ids.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                  </button>
                  <Switch
                    checked={allOn}
                    onCheckedChange={(value) => setMany(ids, value)}
                    aria-label={`${allOn ? "Disable" : "Enable"} all ${group.label} models`}
                    className={cn(!allOn && onCount > 0 && "data-unchecked:bg-primary/40")}
                  />
                </div>
                {open ? (
                  <ul className="divide-y divide-border border-t border-border">
                    {group.models.map((model) => (
                      <ModelRow
                        key={model.id}
                        model={model}
                        on={enabled.has(model.id)}
                        onToggle={(value) => setMany([model.id], value)}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModelRow({ model, on, onToggle }: { model: OcrModel; on: boolean; onToggle: (value: boolean) => void }) {
  const price = formatOcrModelPrice(model);
  return (
    <li
      className={cn("flex cursor-pointer items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40", on && "bg-primary/[0.03]")}
      onClick={() => onToggle(!on)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{shortOcrModelName(model.name)}</span>
          {model.document_focused ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-px font-mono text-[9.5px] font-semibold text-primary uppercase">
              <FileText className="size-2.5" /> docs
            </span>
          ) : null}
          {model.free ? (
            <span className="rounded-full bg-emerald-500/12 px-1.5 py-px font-mono text-[9.5px] font-semibold text-emerald-700 uppercase dark:text-emerald-400">free</span>
          ) : null}
          {model.structured_outputs ? (
            <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[9.5px] text-muted-foreground uppercase">json</span>
          ) : null}
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{model.id}</p>
      </div>
      <div className="hidden shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
        {price ? <p>{price}</p> : null}
        {model.context_length ? <p>{Math.round(model.context_length / 1000)}K context</p> : null}
      </div>
      <span onClick={(event) => event.stopPropagation()}>
        <Switch checked={on} onCheckedChange={onToggle} aria-label={`Show ${model.name} on the canvas`} />
      </span>
    </li>
  );
}

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "idle") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px]",
        state === "error" ? "text-destructive" : "text-muted-foreground",
      )}
      title={error ?? undefined}
    >
      {state === "saving" ? <LoaderCircle className="size-3 animate-spin" /> : state === "saved" ? <Check className="size-3 text-emerald-600" /> : <CircleAlert className="size-3" />}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : (error ?? "Could not save")}
    </span>
  );
}

function BackLink() {
  return (
    <Link href="/app/configuration" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" /> Configuration
    </Link>
  );
}
