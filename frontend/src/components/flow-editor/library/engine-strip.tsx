"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { EngineMark } from "./engine-mark";
import { engineDisplayName, engineFix, engineKind } from "./library-data";
import { StatusDot } from "./library-row";

export type EngineSummary = {
  engine: string;
  online: boolean;
  count: number;
};

type EngineStripProps = {
  engines: EngineSummary[];
  selected: string | null;
  onSelect: (engine: string | null) => void;
  onlyOnline: boolean;
  onOnlyOnlineChange: (value: boolean) => void;
  /** Offline nodes currently hidden by "Only online". */
  hiddenOffline: number;
  /** Offline nodes currently shown (only-online off). */
  shownOffline: number;
};

function engineStatusText(engine: EngineSummary): string {
  if (engineKind(engine.engine) === "builtin") return "built in · always available";
  if (engine.online) return "online";
  return engineKind(engine.engine) === "connection" ? "not connected" : "offline";
}

const chipFocus =
  "focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none";

function EngineChip({
  engine,
  active,
  dimmedBySelection,
  onToggle,
}: {
  engine: EngineSummary;
  active: boolean;
  dimmedBySelection: boolean;
  onToggle: () => void;
}) {
  const name = engineDisplayName(engine.engine);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-pressed={active}
            aria-label={`${name}: ${engine.count} node${engine.count === 1 ? "" : "s"}, ${engineStatusText(engine)}`}
            onClick={onToggle}
            className={cn(
              "relative inline-flex h-8 items-center gap-1.5 rounded-lg border pr-2 pl-1 transition-[background-color,border-color,box-shadow,opacity]",
              chipFocus,
              active
                ? "border-[var(--pulse)] bg-[color-mix(in_srgb,var(--pulse)_12%,var(--lib-chip))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--pulse)_16%,transparent)]"
                : "border-[var(--lib-hair)] bg-[var(--lib-chip)] hover:border-[var(--lib-hair-strong)] hover:bg-[var(--lib-chip-hover)]",
              dimmedBySelection && "opacity-60 hover:opacity-100",
            )}
          />
        }
      >
        <span className="relative inline-flex">
          <EngineMark provider={engine.engine} size={22} dimmed={!engine.online} />
          <StatusDot
            online={engine.online}
            pulse
            className="absolute -top-[2px] -right-[2px] rounded-full ring-2 ring-[var(--lib-chip)]"
          />
        </span>
        <span
          className={cn(
            "font-mono text-[10.5px] tabular-nums",
            engine.online ? "text-foreground" : "text-[var(--lib-ink-soft)]",
          )}
        >
          {engine.count}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="font-medium">{name}</span>
        <span className="ml-1.5 font-mono text-[10px] opacity-75">
          {engine.count} · {engineStatusText(engine)}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Engine filter. Online engines (always incl. the built-in one) are chips;
 * offline / not-connected engines fold behind one "+N offline" chip that
 * expands inline, so the section list below keeps the vertical space.
 */
export function EngineStrip({
  engines,
  selected,
  onSelect,
  onlyOnline,
  onOnlyOnlineChange,
  hiddenOffline,
  shownOffline,
}: EngineStripProps) {
  const [offlineOpen, setOfflineOpen] = useState(false);
  const online = engines.filter((engine) => engine.online);
  const offline = engines.filter((engine) => !engine.online);
  const selectedEngine = engines.find((engine) => engine.engine === selected) ?? null;
  // An offline engine picked earlier stays visible while the drawer is shut.
  const pinnedOffline =
    !offlineOpen && selectedEngine && !selectedEngine.online ? selectedEngine : null;
  const foldedOffline = offline.filter((engine) => engine !== pinnedOffline);

  const chip = (engine: EngineSummary) => (
    <EngineChip
      key={engine.engine}
      engine={engine}
      active={selected === engine.engine}
      dimmedBySelection={Boolean(selected) && selected !== engine.engine}
      onToggle={() => onSelect(selected === engine.engine ? null : engine.engine)}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-[var(--lib-ink-faint)] uppercase">
          Engines{" "}
          <span className="tracking-[0.04em] text-[var(--lib-ink-soft)] normal-case">
            {online.length}/{engines.length} up
          </span>
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={onlyOnline}
          onClick={() => onOnlyOnlineChange(!onlyOnline)}
          title={
            onlyOnline && hiddenOffline > 0
              ? `${hiddenOffline} node${hiddenOffline === 1 ? "" : "s"} from offline engines hidden`
              : !onlyOnline && shownOffline > 0
                ? `Showing ${shownOffline} node${shownOffline === 1 ? "" : "s"} that can't run yet`
                : undefined
          }
          className={cn(
            "group/switch inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-[10px] text-[var(--lib-ink-soft)] transition-colors hover:text-foreground",
            chipFocus,
          )}
        >
          Only online
          <span
            className={cn(
              "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full border transition-colors",
              onlyOnline
                ? "border-transparent bg-[var(--pulse)]"
                : "border-[var(--lib-hair-strong)] bg-[var(--lib-raised)]",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "absolute size-2.5 rounded-full bg-white shadow-sm transition-transform",
                onlyOnline ? "translate-x-[11px]" : "translate-x-[1px]",
              )}
            />
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by engine">
        {online.map(chip)}
        {pinnedOffline ? chip(pinnedOffline) : null}
        {offlineOpen ? offline.map(chip) : null}
        {offline.length > 0 && (offlineOpen || foldedOffline.length > 0) ? (
          <button
            type="button"
            aria-expanded={offlineOpen}
            onClick={() => setOfflineOpen((value) => !value)}
            title={
              offlineOpen
                ? "Hide offline engines"
                : `${foldedOffline.map((engine) => engineDisplayName(engine.engine)).join(", ")}`
            }
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-[var(--lib-hair-strong)] px-2 font-mono text-[10.5px] text-[var(--lib-ink-soft)] transition-colors",
              "hover:border-[var(--pulse)]/50 hover:bg-[var(--lib-chip-hover)] hover:text-foreground",
              chipFocus,
            )}
          >
            <span className="tabular-nums">
              {offlineOpen ? "less" : `+${foldedOffline.length} offline`}
            </span>
            {offlineOpen ? <ChevronDown className="size-3 rotate-180" aria-hidden /> : null}
          </button>
        ) : null}
      </div>

      {selectedEngine ? (
        <SelectedEngineLine engine={selectedEngine} onClear={() => onSelect(null)} />
      ) : offlineOpen && onlyOnline && hiddenOffline > 0 ? (
        <button
          type="button"
          onClick={() => onOnlyOnlineChange(false)}
          className="font-mono text-[10px] text-[var(--lib-ink-soft)] underline-offset-2 transition-colors hover:text-[var(--lib-accent-ink)] hover:underline focus-visible:text-[var(--lib-accent-ink)] focus-visible:outline-none"
        >
          {hiddenOffline} offline node{hiddenOffline === 1 ? "" : "s"} hidden · show
        </button>
      ) : null}
    </div>
  );
}

function SelectedEngineLine({
  engine,
  onClear,
}: {
  engine: EngineSummary;
  onClear: () => void;
}) {
  const fix = engine.online ? null : engineFix(engine.engine);
  return (
    <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-[var(--lib-ink-soft)]">
      <StatusDot online={engine.online} />
      <span className="min-w-0 truncate">
        <span className="text-foreground">{engineDisplayName(engine.engine)}</span>
        {" · "}
        {fix?.command ? (
          <>
            offline — <span className="text-[var(--lib-accent-ink)]">{fix.command}</span>
          </>
        ) : (
          engineStatusText(engine)
        )}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded text-[var(--lib-ink-soft)] transition-colors hover:bg-[var(--lib-row-hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/50 focus-visible:outline-none"
        aria-label="Clear engine filter"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
