"use client";

import { AlertTriangle, FileText, Link2Off } from "lucide-react";

import {
  getParamSchema,
  type ParamFieldDef,
} from "@/lib/canvas/node-param-schema";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import { pageIndexToDisplay } from "@/lib/canvas/page-index-display";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const MAX_CHIPS = 3;

/** Keys shown as chips when present; order is priority. */
const CHIP_PRIORITY = [
  "page_index",
  "confidence_threshold",
  "model",
  "langs",
  "dpi",
  "max_pages",
  "max_tokens",
  "temperature",
  "ocr_engine",
  "layout_model",
  "tableformer_mode",
  "prompt",
];

const SHORT_LABEL: Record<string, string> = {
  page_index: "page",
  confidence_threshold: "conf",
  max_tokens: "tokens",
  max_pages: "pages",
  temperature: "temp",
  langs: "lang",
  ocr_engine: "ocr",
  layout_model: "layout",
  tableformer_mode: "tables",
  prompt: "prompt",
  system_prompt: "system",
};

function formatChipValue(
  field: ParamFieldDef,
  value: string | number | boolean,
): string | null {
  if (value === "" || value === undefined || value === null) return null;
  if (field.type === "boolean") return value ? "on" : "off";
  if (field.type === "textarea")
    return typeof value === "string" && value.trim() ? "set" : null;
  if (field.type === "select" || field.type === "multi-select") {
    const values = String(value)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!values.length) return null;
    const labels = values.map(
      (entry) =>
        field.options?.find((option) => option.value === entry)?.label ?? entry,
    );
    if (labels.length > 2) return `${labels[0]} +${labels.length - 1}`;
    // Long option labels ("Qwen 3.5 · 0.8B (multimodal)") — keep the first token group.
    return labels.map((label) => label.split(" (")[0]).join(", ");
  }
  if (field.key === "page_index")
    return `p.${pageIndexToDisplay(Number(value))}`;
  if (field.key === "confidence_threshold") return Number(value).toFixed(2);
  if (typeof value === "number") return String(value);
  return String(value);
}

export function getNodeSummaryChips(
  data: PipelineNodeData,
): Array<{ key: string; label: string; value: string }> {
  const schema = getParamSchema(data.modelId, data.category).filter(
    (f) => !f.readOnly,
  );
  const byKey = new Map(schema.map((field) => [field.key, field]));
  const chips: Array<{ key: string; label: string; value: string }> = [];

  for (const key of CHIP_PRIORITY) {
    const field = byKey.get(key);
    if (!field) continue;
    const value = formatChipValue(field, data.params[key]);
    if (value === null) continue;
    chips.push({
      key,
      label: SHORT_LABEL[key] ?? field.label.toLowerCase(),
      value,
    });
    if (chips.length >= MAX_CHIPS) break;
  }
  return chips;
}

type PipelineNodeSummaryProps = {
  data: PipelineNodeData;
  /** No upstream wired — shown as a soft hint instead of a param chip. */
  missingInput?: boolean;
  /** Upstream exists but its output type does not match this node's input. */
  incompatibleInput?: boolean;
  className?: string;
};

/**
 * One-line summary of a node's configuration: a few key params as chips,
 * plus readiness hints. Editing happens in the inspector.
 */
export function PipelineNodeSummary({
  data,
  missingInput = false,
  incompatibleInput = false,
  className,
}: PipelineNodeSummaryProps) {
  const chips = getNodeSummaryChips(data);
  const errors = validateNodeParams(data.modelId, data.params);
  const filename = data.params.assetFilename as string | undefined;

  const hint = incompatibleInput
    ? {
        icon: AlertTriangle,
        text: "Input type mismatch",
        tone: "error" as const,
      }
    : errors.length
      ? { icon: AlertTriangle, text: errors[0], tone: "warn" as const }
      : missingInput
        ? { icon: Link2Off, text: "Connect an input", tone: "muted" as const }
        : null;

  if (!chips.length && !filename && !hint) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(chips.length > 0 || filename) && (
        <div className="flex flex-wrap items-center gap-1">
          {filename && (
            <span
              className="inline-flex h-5 max-w-full items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-1.5 font-mono text-[9px] text-foreground/85"
              title={filename}
            >
              <FileText className="size-2.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{filename}</span>
            </span>
          )}
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex h-5 items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-1.5 font-mono text-[9px] whitespace-nowrap"
              title={`${chip.label}: ${chip.value}`}
            >
              <span className="text-muted-foreground">{chip.label}</span>
              <span className="text-foreground/90">{chip.value}</span>
            </span>
          ))}
        </div>
      )}
      {hint && (
        <p
          className={cn(
            "flex items-center gap-1 text-[10px] leading-tight",
            hint.tone === "error" && "text-destructive",
            hint.tone === "warn" && "text-[var(--status-warn)]",
            hint.tone === "muted" && "text-muted-foreground",
          )}
        >
          <hint.icon className="size-3 shrink-0" />
          <span className="truncate">{hint.text}</span>
        </p>
      )}
    </div>
  );
}
