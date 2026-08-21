"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { NodePaletteItem } from "@/components/canvas/node-palette-item";
import { getCategoryColor } from "@/lib/canvas/category-meta";
import {
  readPaletteSectionPrefs,
  subscribePaletteSectionPrefs,
  writePaletteSectionPref,
} from "@/lib/canvas/palette-prefs";
import type { ModelCategoryGroup } from "@/lib/canvas/model-utils";
import { cn } from "@/lib/utils";

type NodePaletteSectionProps = {
  group: ModelCategoryGroup;
  showTopDivider?: boolean;
  sectionIndex?: number;
};

function defaultSectionOpenForIndex(index: number): boolean {
  return index < 3;
}

function resolveSectionOpen(categoryId: string, sectionIndex: number): boolean {
  const prefs = readPaletteSectionPrefs();
  if (categoryId in prefs) return prefs[categoryId] ?? false;
  return defaultSectionOpenForIndex(sectionIndex);
}

export function NodePaletteSection({
  group,
  showTopDivider = false,
  sectionIndex = 0,
}: NodePaletteSectionProps) {
  // Default open state must match SSR; hydrate prefs after mount to avoid
  // localStorage mismatches (React hydration error on aria-expanded/chevron).
  const [open, setOpen] = useState(() =>
    defaultSectionOpenForIndex(sectionIndex),
  );

  useEffect(() => {
    setOpen(resolveSectionOpen(group.categoryId, sectionIndex));
    return subscribePaletteSectionPrefs(() => {
      setOpen(resolveSectionOpen(group.categoryId, sectionIndex));
    });
  }, [group.categoryId, sectionIndex]);

  const accent = getCategoryColor(group.categoryId);

  const toggle = () => {
    writePaletteSectionPref(group.categoryId, !open);
  };

  return (
    <section className={cn(showTopDivider && "mt-2")}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`palette-section-${group.categoryId}`}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left",
          "transition-colors hover:bg-muted/40",
        )}
      >
        <span
          className="size-[9px] shrink-0 rounded-[3px]"
          style={{
            backgroundColor: accent,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground/85">
          {group.categoryLabel}
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {group.models.length}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={`palette-section-${group.categoryId}`}
          className="mt-1 flex flex-col gap-1.5 py-1 pl-1"
        >
          {group.models.map((model) => (
            <li key={model.id}>
              <NodePaletteItem model={model} categoryColor={accent} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
