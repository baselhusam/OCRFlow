import type { LucideIcon } from "lucide-react";
import {
  CloudCog,
  FileInput,
  LayoutPanelTop,
  Puzzle,
  ScanText,
  Shapes,
  Sigma,
  Sparkles,
  Table2,
  Image as ImageIcon,
  Wand2,
} from "lucide-react";

import type { Pipeline } from "@/lib/api/client";
import { getModelDescription, getModelLabel } from "@/lib/canvas/model-utils";
import {
  providerDisplayName,
  REMOTE_PROVIDERS,
  REMOTE_PROVIDER_ORDER,
  LANGUAGE_PROVIDER_ORDER,
} from "@/lib/canvas/provider-availability";
import type { CategoryMeta, ModelCatalogEntry } from "@/lib/canvas/types";

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

export type LibrarySectionId =
  | "input"
  | "read"
  | "layout"
  | "tables"
  | "figures"
  | "formulas"
  | "convert"
  | "cloud_ocr"
  | "extract"
  | "pipelines"
  | "other";

export type LibrarySectionMeta = {
  id: LibrarySectionId;
  label: string;
  icon: LucideIcon;
  /** CSS color used for the section icon tile. */
  accent: string;
  /** Category ids routed into this section, in display order. */
  categories: string[];
};

/** Display order is the array order. */
export const LIBRARY_SECTIONS: LibrarySectionMeta[] = [
  {
    id: "input",
    label: "Input",
    icon: FileInput,
    accent: "var(--node-page-loader)",
    categories: ["page_loader", "preprocess"],
  },
  {
    id: "read",
    label: "Read text",
    icon: ScanText,
    accent: "var(--node-text-recognition)",
    categories: ["text_detection", "text_recognition"],
  },
  {
    id: "layout",
    label: "Layout",
    icon: LayoutPanelTop,
    accent: "var(--node-layout-detection)",
    categories: ["layout_detection", "reading_order"],
  },
  {
    id: "tables",
    label: "Tables",
    icon: Table2,
    accent: "var(--node-table-detection)",
    categories: ["table_detection", "table_structure", "table_cell_ocr"],
  },
  {
    id: "figures",
    label: "Figures",
    icon: ImageIcon,
    accent: "var(--node-figure-classification)",
    categories: ["figure_classification", "figure_captioning"],
  },
  {
    id: "formulas",
    label: "Formulas",
    icon: Sigma,
    accent: "var(--node-formula-detection)",
    categories: ["formula_detection", "formula_recognition"],
  },
  {
    id: "convert",
    label: "Convert",
    icon: Wand2,
    accent: "var(--node-vlm-convert)",
    categories: ["vlm_convert", "assembler"],
  },
  {
    // Filled with one row per OCR model discovered on an OpenRouter connection.
    id: "cloud_ocr",
    label: "Cloud OCR",
    icon: CloudCog,
    accent: "var(--node-vlm-convert)",
    categories: [],
  },
  {
    id: "extract",
    label: "Extract with AI",
    icon: Sparkles,
    accent: "var(--pulse)",
    categories: ["llm_extract", "vision_language", "text_generation"],
  },
  {
    id: "pipelines",
    label: "My pipelines",
    icon: Puzzle,
    accent: "var(--primary)",
    categories: [],
  },
  {
    id: "other",
    label: "Other",
    icon: Shapes,
    accent: "var(--node-default)",
    categories: [],
  },
];

const SECTION_BY_CATEGORY = new Map<string, LibrarySectionId>();
const CATEGORY_RANK = new Map<string, number>();
for (const section of LIBRARY_SECTIONS) {
  section.categories.forEach((category, index) => {
    SECTION_BY_CATEGORY.set(category, section.id);
    CATEGORY_RANK.set(category, index);
  });
}

export function sectionForCategory(category: string): LibrarySectionId {
  return SECTION_BY_CATEGORY.get(category) ?? "other";
}

export function getSectionMeta(id: LibrarySectionId): LibrarySectionMeta {
  return LIBRARY_SECTIONS.find((section) => section.id === id)!;
}

/* -------------------------------------------------------------------------- */
/* Engines                                                                     */
/* -------------------------------------------------------------------------- */

/** Chip id for every in-process OCRFlow provider (loaders, transforms, …). */
export const BUILTIN_ENGINE = "ocrflow";

export type EngineKind = "service" | "connection" | "builtin";

const CONNECTED = new Set<string>(LANGUAGE_PROVIDER_ORDER);

export function engineForProvider(provider: string): string {
  if (REMOTE_PROVIDERS.has(provider) || CONNECTED.has(provider)) {
    return provider;
  }
  return BUILTIN_ENGINE;
}

export function engineKind(engine: string): EngineKind {
  if (engine === BUILTIN_ENGINE) return "builtin";
  if (CONNECTED.has(engine)) return "connection";
  return "service";
}

export function engineDisplayName(engine: string): string {
  if (engine === BUILTIN_ENGINE) return "OCRFlow";
  return providerDisplayName(engine);
}

const ENGINE_ORDER: string[] = [
  BUILTIN_ENGINE,
  ...REMOTE_PROVIDER_ORDER,
  ...LANGUAGE_PROVIDER_ORDER,
];

export function engineRank(engine: string): number {
  const index = ENGINE_ORDER.indexOf(engine);
  return index === -1 ? ENGINE_ORDER.length : index;
}

/** How to bring an offline engine back; `command` is copy-pasteable. */
export function engineFix(
  engine: string,
): { command?: string; hint: string } | null {
  switch (engineKind(engine)) {
    case "builtin":
      return null;
    case "connection":
      return {
        hint: `Add and validate a ${engineDisplayName(engine)} connection in Configuration.`,
      };
    default:
      if (engine === "ollama") {
        return { command: "ollama serve", hint: "Start Ollama on the host." };
      }
      return {
        command: `make ocr-${engine}`,
        hint: "Run from the repository root.",
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function modelMatchesQuery(
  model: ModelCatalogEntry,
  categoryLabel: string,
  q: string,
): boolean {
  if (!q) return true;
  const engine = engineForProvider(model.provider);
  const haystack = [
    getModelLabel(model),
    model.id,
    model.provider,
    engineDisplayName(engine),
    providerDisplayName(model.provider),
    categoryLabel,
    model.category.replace(/_/g, " "),
    getSectionMeta(sectionForCategory(model.category)).label,
    getModelDescription(model),
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(q);
}

export function pipelineMatchesQuery(pipeline: Pipeline, q: string): boolean {
  if (!q) return true;
  return [
    pipeline.name,
    pipeline.description ?? "",
    pipeline.input_type_label ?? "",
    pipeline.output_type_label ?? "",
    "pipeline",
  ]
    .join("\n")
    .toLowerCase()
    .includes(q);
}

/* -------------------------------------------------------------------------- */
/* Grouping                                                                    */
/* -------------------------------------------------------------------------- */

/** A catalog node pre-configured for one hosted model (e.g. an OpenRouter OCR model). */
export type LibraryPreset = {
  /** Params merged over the node defaults when the row is added. */
  params: Record<string, string | boolean | number>;
  /** Provider-side model id, shown in place of the node id. */
  modelId: string;
  description: string;
  /** Short secondary text for the row (vendor, price). */
  meta: string;
  details: Array<{ label: string; value: string }>;
  searchText: string;
};

export type LibraryModelItem = {
  model: ModelCatalogEntry;
  /** Unique row key; defaults to the catalog id. */
  key?: string;
  label: string;
  categoryLabel: string;
  engine: string;
  offline: boolean;
  offlineMessage?: string;
  preferred: boolean;
  /** Route the row to a section other than its category's. */
  section?: LibrarySectionId;
  /** Explicit order within the section (lower first), before the label. */
  rank?: number;
  preset?: LibraryPreset;
};

export type LibraryModelGroup = {
  section: LibrarySectionMeta;
  items: LibraryModelItem[];
};

export function categoryLabelMap(categories: CategoryMeta[]): Map<string, string> {
  return new Map(categories.map((category) => [category.id, category.display_name]));
}

export function humanizeCategory(category: string): string {
  const text = category.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function groupLibraryItems(items: LibraryModelItem[]): LibraryModelGroup[] {
  const bySection = new Map<LibrarySectionId, LibraryModelItem[]>();
  for (const item of items) {
    const id = item.section ?? sectionForCategory(item.model.category);
    const list = bySection.get(id) ?? [];
    list.push(item);
    bySection.set(id, list);
  }

  return LIBRARY_SECTIONS.flatMap((section) => {
    const list = bySection.get(section.id);
    if (!list?.length) return [];
    const sorted = [...list].sort((a, b) => {
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      if (a.offline !== b.offline) return a.offline ? 1 : -1;
      const rankA = CATEGORY_RANK.get(a.model.category) ?? 99;
      const rankB = CATEGORY_RANK.get(b.model.category) ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      const engineDelta = engineRank(a.engine) - engineRank(b.engine);
      if (engineDelta !== 0) return engineDelta;
      if (a.rank !== undefined && b.rank !== undefined && a.rank !== b.rank) return a.rank - b.rank;
      return a.label.localeCompare(b.label);
    });
    return [{ section, items: sorted }];
  });
}
