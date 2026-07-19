"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type JsonTreeProps = {
  data: unknown;
  defaultOpen?: boolean;
  maxDepth?: number;
  className?: string;
};

function JsonValue({
  value,
  depth,
  maxDepth,
}: {
  value: unknown;
  depth: number;
  maxDepth: number;
}) {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (value === undefined) {
    return <span className="text-muted-foreground">undefined</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-amber-600 dark:text-amber-400">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-sky-600 dark:text-sky-400">{value}</span>;
  }
  if (typeof value === "string") {
    const truncated = value.length > 120 ? `${value.slice(0, 120)}…` : value;
    return (
      <span className="text-emerald-700 dark:text-emerald-400" title={value}>
        &quot;{truncated}&quot;
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (depth >= maxDepth) {
      return <span className="text-muted-foreground">[{value.length} items]</span>;
    }
    return (
      <div className="pl-3">
        [
        {value.map((item, i) => (
          <div key={i} className="border-l border-border/60 pl-2">
            <JsonValue value={item} depth={depth + 1} maxDepth={maxDepth} />
            {i < value.length - 1 && ","}
          </div>
        ))}
        ]
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (depth >= maxDepth) {
      return <span className="text-muted-foreground">{`{${entries.length} keys}`}</span>;
    }
    return (
      <div className="pl-3">
        {"{"}
        {entries.map(([key, val], i) => (
          <div key={key} className="border-l border-border/60 pl-2">
            <span className="text-foreground/80">{key}</span>
            {": "}
            <JsonValue value={val} depth={depth + 1} maxDepth={maxDepth} />
            {i < entries.length - 1 && ","}
          </div>
        ))}
        {"}"}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

export function JsonTree({
  data,
  defaultOpen = false,
  maxDepth = 3,
  className,
}: JsonTreeProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-sm border border-border bg-secondary/20", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-left hover:bg-secondary/40"
      >
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
          Raw JSON
        </span>
      </button>
      {open && (
        <pre className="max-h-48 overflow-auto overscroll-contain border-t border-border p-2 font-mono text-[10px] leading-relaxed text-foreground/80">
          <JsonValue value={data} depth={0} maxDepth={maxDepth} />
        </pre>
      )}
    </div>
  );
}

export function JsonTreeFull({ data, className }: { data: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-64 overflow-auto overscroll-contain rounded-sm border border-border bg-secondary/20 p-2 font-mono text-[10px] leading-relaxed text-foreground/80",
        className,
      )}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
