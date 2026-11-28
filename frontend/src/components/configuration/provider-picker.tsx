"use client";

import { Check, Server } from "lucide-react";

import { EngineMark } from "@/components/flow-editor/library/engine-mark";
import type { ModelProtocol } from "@/lib/api/model-connections";
import { cn } from "@/lib/utils";

type ProviderOption = { value: ModelProtocol; label: string; note: string; tag?: string };

const CLOUD: ProviderOption[] = [
  { value: "openai", label: "OpenAI", note: "Official API · GPT models" },
  { value: "anthropic", label: "Anthropic", note: "Official API · Claude models" },
  { value: "openrouter", label: "OpenRouter", note: "Hundreds of OCR & vision models", tag: "OCR" },
];

const SELF_HOSTED: ProviderOption[] = [
  { value: "openai-compatible", label: "OpenAI-compatible", note: "vLLM, LiteLLM, LM Studio, gateways" },
  { value: "anthropic-compatible", label: "Anthropic-compatible", note: "Claude-compatible on-prem gateways" },
];

type ProviderPickerProps = {
  value: ModelProtocol;
  onChange: (value: ModelProtocol) => void;
};

/** Logo cards for choosing a connection protocol (native radios underneath). */
export function ProviderPicker({ value, onChange }: ProviderPickerProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1.5 text-xs font-semibold">Provider</legend>
      <Group title="Cloud" options={CLOUD} value={value} onChange={onChange} columns="sm:grid-cols-3" />
      <Group title="Self-hosted" options={SELF_HOSTED} value={value} onChange={onChange} columns="sm:grid-cols-2" compatible />
    </fieldset>
  );
}

function Group({
  title,
  options,
  value,
  onChange,
  columns,
  compatible = false,
}: {
  title: string;
  options: ProviderOption[];
  value: ModelProtocol;
  onChange: (value: ModelProtocol) => void;
  columns: string;
  compatible?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{title}</p>
      <div className={cn("grid grid-cols-1 gap-2", columns)}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "group relative flex cursor-pointer gap-3 rounded-xl border bg-card p-3 transition-[border-color,background-color,box-shadow]",
                compatible ? "items-center" : "flex-col",
                selected
                  ? "border-primary bg-primary/[0.06] shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
              )}
            >
              <input
                type="radio"
                name="provider-protocol"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="relative inline-flex shrink-0">
                <EngineMark provider={option.value} size={34} />
                {compatible ? (
                  <span className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                    <Server className="size-2.5" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-foreground">{option.label}</span>
                  {option.tag ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px font-mono text-[9px] font-semibold tracking-wide text-primary">
                      {option.tag}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{option.note}</span>
              </span>
              <span
                className={cn(
                  "absolute top-2.5 right-2.5 inline-flex size-[18px] items-center justify-center rounded-full border transition-colors",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
