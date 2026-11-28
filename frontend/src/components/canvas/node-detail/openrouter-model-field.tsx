"use client";

import { Check, ChevronsUpDown, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { findOcrModel, useOcrCatalog } from "@/hooks/use-ocr-catalog";
import {
  formatOcrModelPrice,
  ocrModelVendor,
  shortOcrModelName,
  type OcrModel,
} from "@/lib/api/model-connections";
import { cn } from "@/lib/utils";
import { VendorMark } from "@/components/configuration/vendor-mark";

type Params = Record<string, string | boolean | number>;

type OpenRouterFieldsProps = {
  params: Params;
  onChange: (patch: Params) => void;
};

/**
 * Connection + model picker for OpenRouter OCR nodes.
 *
 * Reads the shared OCR catalog (validated connections only), so it works for
 * every signed-in user, not just people who can open Configuration.
 */
export function OpenRouterOcrFields({ params, onChange }: OpenRouterFieldsProps) {
  const catalog = useOcrCatalog();
  const connections = useMemo(
    () => catalog.connections.filter((connection) => connection.protocol === "openrouter"),
    [catalog.connections],
  );
  const connectionId = String(params.connection_id ?? "");
  const modelId = String(params.model ?? "");
  const connection =
    connections.find((entry) => entry.connection_id === connectionId) ??
    connections.find((entry) => entry.connection_name === connectionId);
  const selected = connection ? findOcrModel([connection], modelId) : undefined;

  if (catalog.status !== "ready" && connections.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {catalog.status === "error" ? "Could not load OpenRouter models." : "Loading OpenRouter models…"}
      </p>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-1.5 rounded-lg border border-amber-500/25 bg-amber-500/8 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
        <p>No validated OpenRouter connection yet. Add your API key to list its OCR models here.</p>
        <Link href="/app/configuration" className="font-medium underline-offset-2 hover:underline">
          Open Configuration →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.length > 1 || !connection ? (
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase">
            OpenRouter connection
          </span>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 font-mono text-xs"
            value={connection?.connection_id ?? ""}
            onChange={(event) => {
              const next = connections.find((entry) => entry.connection_id === event.target.value);
              if (!next) return;
              const keep = findOcrModel([next], modelId);
              onChange({
                connection_id: next.connection_id,
                model: keep ? keep.id : "",
                model_label: keep ? keep.name : "",
              });
            }}
          >
            {!connection ? <option value="">Choose a connection</option> : null}
            {connections.map((entry) => (
              <option key={entry.connection_id} value={entry.connection_id}>
                {entry.connection_name} · {entry.models.length} models
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase">
            OCR model
          </span>
          <ProviderLogo provider="openrouter" size={14} />
        </div>
        <ModelPicker
          models={connection?.models ?? []}
          disabled={!connection}
          selected={selected}
          fallbackId={modelId}
          onSelect={(model) =>
            onChange({
              connection_id: connection!.connection_id,
              model: model.id,
              model_label: model.name,
            })
          }
        />
        {modelId && connection && !selected ? (
          <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
            {modelId} is no longer listed on this connection. Pick another model.
          </p>
        ) : null}
        {selected ? <ModelFacts model={selected} /> : null}
      </div>
    </div>
  );
}

function ModelFacts({ model }: { model: OcrModel }) {
  const price = formatOcrModelPrice(model);
  const facts = [
    price,
    model.context_length ? `${Math.round(model.context_length / 1000)}K context` : null,
    model.structured_outputs ? "JSON mode" : null,
  ].filter(Boolean);
  if (facts.length === 0) return null;
  return <p className="font-mono text-[10px] text-muted-foreground">{facts.join(" · ")}</p>;
}

function ModelPicker({
  models,
  selected,
  fallbackId,
  disabled,
  onSelect,
}: {
  models: OcrModel[];
  selected: OcrModel | undefined;
  fallbackId: string;
  disabled: boolean;
  onSelect: (model: OcrModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [documentsOnly, setDocumentsOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter(
      (model) =>
        (!documentsOnly || model.document_focused) &&
        (!q || `${model.name}\n${model.id}`.toLowerCase().includes(q)),
    );
  }, [models, query, documentsOnly]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-xs transition-colors",
          "hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-50",
        )}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate font-medium text-foreground">{shortOcrModelName(selected.name)}</span>
              <span className="block truncate font-mono text-[10px] text-muted-foreground">{selected.id}</span>
            </>
          ) : (
            <span className="block truncate font-mono text-muted-foreground">
              {fallbackId || "Choose a model"}
            </span>
          )}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${models.length} models`}
            aria-label="Search OpenRouter models"
            className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={documentsOnly}
            onChange={(event) => setDocumentsOnly(event.target.checked)}
            className="accent-[var(--primary)]"
          />
          <FileText className="size-3" aria-hidden />
          Only models described for documents
        </label>
        <ul className="max-h-[320px] overflow-y-auto p-1" role="listbox" aria-label="OpenRouter OCR models">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">No models match.</li>
          ) : (
            filtered.map((model) => {
              const active = model.id === selected?.id;
              const price = formatOcrModelPrice(model);
              return (
                <li key={model.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(model);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                      active && "bg-primary/8",
                    )}
                  >
                    <VendorMark vendor={model.id} size={22} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {active ? <Check className="size-3 shrink-0 text-primary" aria-hidden /> : null}
                        <span className="truncate text-xs font-medium text-foreground">{shortOcrModelName(model.name)}</span>
                        {model.document_focused ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 font-mono text-[9px] text-primary uppercase">
                            docs
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        {ocrModelVendor(model.id)}
                        {price ? ` · ${price}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
