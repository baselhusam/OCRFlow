"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Search, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isEditableKeyboardTarget } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

/** Search box that also focuses on "/" (when not typing elsewhere). */
export function ListSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableKeyboardTarget(event.target)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <label
      className={cn(
        "flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/15",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            inputRef.current?.blur();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : (
        <kbd className="hidden rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground sm:inline">
          /
        </kbd>
      )}
    </label>
  );
}

export type SegmentOption<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border bg-card p-0.5"
    >
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors",
              active
                ? "bg-primary/10 text-primary dark:bg-primary/25"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "font-mono text-[10.5px] tabular-nums",
                  active ? "text-primary/80" : "text-muted-foreground/70",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SortSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Select
      value={value}
      items={options.map((option) => ({ value: option.key, label: option.label }))}
      onValueChange={(next) => onChange(next as T)}
    >
      <SelectTrigger
        aria-label="Sort"
        className="h-9! min-w-[132px] rounded-lg bg-card text-[13px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Responsive row: search grows, controls wrap beneath it on phones. */
export function ListToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">{children}</div>
  );
}

/** Centered empty-state panel used by list pages. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  children,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-[var(--landing-ghost-border)] px-6 py-12 text-center sm:px-10",
        className,
      )}
    >
      {icon ? <div className="mb-5">{icon}</div> : null}
      <p className="text-lg font-bold tracking-[-0.01em] text-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}
