"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { PipelinePaletteItem } from "@/components/canvas/pipeline-palette-item";
import {
  parsePaletteSectionPrefs,
  readPaletteSectionPrefsSnapshot,
  subscribePaletteSectionPrefs,
  writePaletteSectionPref,
} from "@/lib/canvas/palette-prefs";
import type { Pipeline } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const PIPELINE_PALETTE_SECTION_ID = "user-pipelines";

const PIPELINE_SECTION_ACCENT = "var(--primary)";

type PipelinePaletteSectionProps = {
  pipelines: Pipeline[];
};

export function PipelinePaletteSection({ pipelines }: PipelinePaletteSectionProps) {
  const prefsSnapshot = useSyncExternalStore(
    subscribePaletteSectionPrefs,
    readPaletteSectionPrefsSnapshot,
    () => "{}",
  );
  const open = useMemo(() => {
    const prefs = parsePaletteSectionPrefs(prefsSnapshot);
    if (PIPELINE_PALETTE_SECTION_ID in prefs) {
      return prefs[PIPELINE_PALETTE_SECTION_ID] ?? false;
    }
    return true;
  }, [prefsSnapshot]);

  const toggle = () => {
    writePaletteSectionPref(PIPELINE_PALETTE_SECTION_ID, !open);
  };

  return (
    <section className="mb-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="palette-section-user-pipelines"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left",
          "transition-colors hover:bg-muted/40",
        )}
      >
        <span
          className="size-[9px] shrink-0 rounded-[3px]"
          style={{
            backgroundColor: PIPELINE_SECTION_ACCENT,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${PIPELINE_SECTION_ACCENT} 22%, transparent)`,
          }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground/85">
          My Pipelines
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {pipelines.length}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id="palette-section-user-pipelines"
          className="mt-1 flex flex-col gap-1.5 py-1 pl-1"
        >
          {pipelines.map((pipeline) => (
            <li key={pipeline.id}>
              <PipelinePaletteItem pipeline={pipeline} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
