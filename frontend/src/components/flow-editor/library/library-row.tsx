"use client";

import { ArrowRight, Check, Copy, GripVertical, Info, Plus, Star } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import styles from "./library.module.css";

/* -------------------------------------------------------------------------- */
/* Highlight                                                                   */
/* -------------------------------------------------------------------------- */

/** Wrap every case-insensitive occurrence of `q` in a violet mark. */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(query, cursor);
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark
        key={index}
        className="rounded-[3px] bg-[color-mix(in_srgb,var(--pulse)_20%,transparent)] px-px text-inherit shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--pulse)_55%,transparent)]"
      >
        {text.slice(index, index + query.length)}
      </mark>,
    );
    cursor = index + query.length;
    index = lower.indexOf(query, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

/* -------------------------------------------------------------------------- */
/* Status dot                                                                  */
/* -------------------------------------------------------------------------- */

export function StatusDot({
  online,
  pulse = false,
  className,
}: {
  online: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex size-1.5 shrink-0", className)} aria-hidden>
      {online && pulse ? (
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-[var(--lib-online)]",
            styles.ping,
          )}
        />
      ) : null}
      <span
        className={cn(
          "relative size-1.5 rounded-full",
          online ? "bg-[var(--lib-online)]" : "bg-[var(--lib-offline)]",
        )}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

type LibraryRowProps = {
  tile: ReactNode;
  title: ReactNode;
  /** Plain-text name for aria labels. */
  name: string;
  meta: ReactNode;
  preferred?: boolean;
  offline?: boolean;
  onAdd: () => void;
  onDragStart: (event: React.DragEvent) => void;
  info: ReactNode;
};

const iconButtonClass =
  "inline-flex size-7 items-center justify-center rounded-md text-[var(--lib-ink-soft)] transition-colors hover:bg-[color-mix(in_srgb,var(--pulse)_14%,transparent)] hover:text-[var(--lib-accent-ink)] focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none";

export function LibraryRow({
  tile,
  title,
  name,
  meta,
  preferred = false,
  offline = false,
  onAdd,
  onDragStart,
  info,
}: LibraryRowProps) {
  const [added, setAdded] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const add = () => {
    onAdd();
    setAdded((value) => value + 1);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAdded(0), 900);
  };

  return (
    <div
      className={cn(
        "group/row relative rounded-lg",
        added > 0 && styles.added,
      )}
    >
      <div
        role="button"
        tabIndex={0}
        data-library-row=""
        draggable
        onDragStart={onDragStart}
        onClick={add}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            add();
          }
        }}
        aria-label={`Add ${name}${offline ? " (engine offline)" : ""}`}
        className={cn(
          "relative flex h-11 w-full cursor-grab items-center gap-2.5 rounded-lg pr-2 pl-4 text-left select-none",
          "transition-colors duration-150 active:cursor-grabbing",
          "hover:bg-[var(--lib-row-hover)] focus-visible:bg-[var(--lib-row-hover)]",
          "focus-visible:ring-1 focus-visible:ring-[var(--pulse)]/60 focus-visible:outline-none",
          infoOpen && "bg-[var(--lib-row-hover)]",
        )}
      >
        {/* violet hairline accent */}
        <span
          className={cn(
            "pointer-events-none absolute inset-y-2.5 left-0 w-[2px] rounded-full bg-[var(--pulse)] opacity-0 transition-opacity",
            "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
            infoOpen && "opacity-100",
          )}
          aria-hidden
        />
        <GripVertical
          className="pointer-events-none absolute left-[3px] size-3 text-[var(--lib-ink-faint)] opacity-0 transition-opacity group-hover/row:opacity-100"
          aria-hidden
        />
        {tile}
        <span className={cn("flex min-w-0 flex-1 flex-col gap-[3px]", offline && "opacity-60")}>
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[13px] leading-4 font-medium text-foreground">
              {title}
            </span>
            {preferred ? (
              <Star
                className="size-3 shrink-0 fill-[var(--pulse)] text-[var(--pulse)]"
                aria-label="Your default OCR model"
              />
            ) : null}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] leading-3 tracking-[0.02em] text-[var(--lib-ink-soft)]">
            {meta}
          </span>
        </span>
      </div>

      <div
        className={cn(
          "absolute inset-y-0 right-1 flex items-center gap-0.5 pl-5",
          "bg-[linear-gradient(to_right,transparent,var(--lib-row-hover)_18px)]",
          "opacity-0 transition-opacity duration-150",
          "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          infoOpen && "opacity-100",
        )}
      >
        <Popover open={infoOpen} onOpenChange={setInfoOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={iconButtonClass}
                aria-label={`About ${name}`}
              />
            }
          >
            <Info className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={14}
            alignOffset={-8}
            className={cn(
              styles.root,
              "w-[300px] min-w-0 rounded-xl border-[var(--lib-hair-strong)] bg-popover shadow-[0_18px_48px_-12px_rgba(20,18,37,0.35)]",
            )}
          >
            {info}
            <div className="border-t border-[var(--lib-hair)] p-2">
              <button
                type="button"
                onClick={() => {
                  add();
                  setInfoOpen(false);
                }}
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-popover focus-visible:outline-none"
              >
                <Plus className="size-3.5" />
                Add to canvas
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          tabIndex={-1}
          className={iconButtonClass}
          onClick={add}
          aria-label={`Add ${name}`}
        >
          {added > 0 ? (
            <Check className="size-3.5 text-[var(--lib-accent-ink)]" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Info popover bodies                                                         */
/* -------------------------------------------------------------------------- */

function InfoLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[9.5px] tracking-[0.12em] text-[var(--lib-ink-faint)] uppercase">
      {children}
    </p>
  );
}

function WireChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md border px-2 font-mono text-[10.5px] text-foreground"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex h-8 items-center gap-2 rounded-md border border-[var(--lib-hair-strong)] bg-[#15131f] pr-1 pl-2.5 font-mono text-[11px] text-[#e7e5f0]">
      <span className="text-[#6e6a85] select-none">$</span>
      <code className="min-w-0 flex-1 truncate">{command}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          } catch {
            // Clipboard blocked — the command is still selectable.
          }
        }}
        className="inline-flex size-6 items-center justify-center rounded text-[#9a95b5] transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/60 focus-visible:outline-none"
        aria-label={copied ? "Copied" : `Copy ${command}`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

export type ModelInfoProps = {
  tile: ReactNode;
  name: string;
  modelId: string;
  description: string;
  engineName: string;
  categoryLabel: string;
  accent: string;
  input: string;
  output: string;
  compute: string;
  offline: boolean;
  offlineMessage?: string;
  fix: { command?: string; hint: string } | null;
  /** Extra rows for the facts table (price, context window, connection). */
  details?: Array<{ label: string; value: string }>;
};

export function ModelInfo({
  tile,
  name,
  modelId,
  description,
  engineName,
  categoryLabel,
  accent,
  input,
  output,
  compute,
  offline,
  offlineMessage,
  fix,
  details = [],
}: ModelInfoProps) {
  return (
    <div className="space-y-3.5 p-3.5">
      <div className="flex items-start gap-2.5">
        {tile}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-5 font-semibold text-foreground">{name}</p>
          <p className="truncate font-mono text-[10px] text-[var(--lib-ink-soft)]">{modelId}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border px-2 font-mono text-[9.5px] tracking-[0.06em] uppercase",
            offline
              ? "border-[var(--lib-offline)]/35 text-[var(--lib-offline)]"
              : "border-[var(--lib-online)]/35 text-[var(--lib-online)]",
          )}
        >
          <StatusDot online={!offline} />
          {offline ? "offline" : "online"}
        </span>
      </div>

      <p className="text-[12.5px] leading-[1.5] text-[var(--lib-ink-soft)]">{description}</p>

      <div className="space-y-1.5">
        <InfoLabel>Wires</InfoLabel>
        <div className="flex min-w-0 items-center gap-1.5">
          <WireChip label={input} color={accent} />
          <ArrowRight className="size-3 shrink-0 text-[var(--lib-ink-faint)]" aria-hidden />
          <WireChip label={output} color={accent} />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[10.5px]">
        <dt className="text-[var(--lib-ink-faint)]">engine</dt>
        <dd className="truncate text-foreground">{engineName}</dd>
        <dt className="text-[var(--lib-ink-faint)]">task</dt>
        <dd className="truncate text-foreground">{categoryLabel}</dd>
        <dt className="text-[var(--lib-ink-faint)]">compute</dt>
        <dd className="truncate text-foreground">{compute}</dd>
        {details.map((detail) => (
          <Fragment key={detail.label}>
            <dt className="text-[var(--lib-ink-faint)]">{detail.label}</dt>
            <dd className="truncate text-foreground">{detail.value}</dd>
          </Fragment>
        ))}
      </dl>

      {offline ? (
        <div className="space-y-2 rounded-lg border border-[var(--lib-offline)]/25 bg-[color-mix(in_srgb,var(--lib-offline)_7%,transparent)] p-2.5">
          <p className="text-[12px] leading-[1.45] text-foreground">
            {offlineMessage ?? `${engineName} is not running.`}
          </p>
          {fix?.command ? <CopyCommand command={fix.command} /> : null}
          {fix ? (
            <p className="font-mono text-[10px] text-[var(--lib-ink-soft)]">
              {fix.command ? (
                fix.hint
              ) : (
                <Link
                  href="/app/configuration"
                  className="text-[var(--lib-accent-ink)] underline-offset-2 hover:underline"
                >
                  Open Configuration →
                </Link>
              )}
            </p>
          ) : null}
          <p className="font-mono text-[10px] text-[var(--lib-ink-faint)]">
            You can still place it — it runs once the engine is up.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function PipelineInfo({
  tile,
  name,
  description,
  io,
  stats,
}: {
  tile: ReactNode;
  name: string;
  description: string | null;
  io: string | null;
  stats: string;
}) {
  return (
    <div className="space-y-3 p-3.5">
      <div className="flex items-start gap-2.5">
        {tile}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-5 font-semibold text-foreground">{name}</p>
          <p className="font-mono text-[10px] text-[var(--lib-ink-soft)]">saved pipeline</p>
        </div>
      </div>
      {description ? (
        <p className="text-[12.5px] leading-[1.5] text-[var(--lib-ink-soft)]">{description}</p>
      ) : null}
      {io ? (
        <div className="space-y-1.5">
          <InfoLabel>Wires</InfoLabel>
          <p className="font-mono text-[11px] text-foreground">{io}</p>
        </div>
      ) : null}
      <p className="font-mono text-[10.5px] text-[var(--lib-ink-soft)]">{stats}</p>
    </div>
  );
}
