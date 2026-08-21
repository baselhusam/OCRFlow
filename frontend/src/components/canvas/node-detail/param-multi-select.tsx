"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ParamFieldDef } from "@/lib/canvas/node-param-schema";
import {
  joinLanguageCodes,
  parseLanguageCodes,
} from "@/lib/canvas/node-param-schema";
import { cn } from "@/lib/utils";

type ParamMultiSelectProps = {
  field: ParamFieldDef;
  id?: string;
  value: string | boolean | number | undefined;
  onChange: (value: string) => void;
  className?: string;
};

function filterOptions(
  options: Array<{ value: string; label: string }>,
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(normalized) ||
      opt.value.toLowerCase().includes(normalized),
  );
}

export function ParamMultiSelect({
  field,
  id,
  value,
  onChange,
  className,
}: ParamMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fallback = field.options?.[0]?.value ?? "";
  const options = field.options ?? [];
  const selected = parseLanguageCodes(
    typeof value === "string" || typeof value === "number" ? value : undefined,
    fallback,
  );
  const selectedSet = new Set(selected);
  const optionByValue = new Map(options.map((opt) => [opt.value, opt.label]));
  const filteredOptions = useMemo(
    () => filterOptions(options, searchQuery),
    [options, searchQuery],
  );

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const toggle = (code: string) => {
    const next = new Set(selectedSet);
    if (next.has(code)) {
      if (next.size === 1) return;
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(joinLanguageCodes([...next]));
  };

  const remove = (code: string) => {
    if (selectedSet.size === 1) return;
    const next = selected.filter((entry) => entry !== code);
    onChange(joinLanguageCodes(next));
  };

  const summary =
    selected.length === 0
      ? "Select languages"
      : selected.length === 1
        ? (optionByValue.get(selected[0]!) ?? selected[0])
        : `${selected.length} languages selected`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={id}
        className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase"
      >
        {field.label}
      </Label>
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger
          id={id}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 font-mono text-xs text-foreground transition-colors",
            "hover:bg-muted/40 data-popup-open:border-ring data-popup-open:ring-3 data-popup-open:ring-ring/50",
          )}
        >
          <span className="truncate text-left">{summary}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={20}
          className="flex max-h-[min(16rem,var(--available-height))] flex-col overflow-hidden p-0"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
            <Search
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search languages…"
              aria-label={`Search ${field.label.toLowerCase()}`}
              className="h-7 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No languages match &ldquo;{searchQuery.trim()}&rdquo;
              </p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-2.5" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {opt.value}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-foreground/90"
            >
              {code}
              <button
                type="button"
                onClick={() => remove(code)}
                disabled={selected.length === 1}
                className="rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`Remove ${code}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
