import type { NodeCachedOutput } from "@/lib/canvas/types";
import type { WireKind } from "@/lib/canvas/wire-types";

import { sliceOutputByHandle } from "@/lib/canvas/output-slice";

export type RegionWire = {
  id: string;
  label?: string;
  bbox: number[];
  confidence?: number;
  docling_label?: string | null;
  provider_label?: string | null;
};

export type FigureWire = {
  id: string;
  bbox: number[];
  category?: string | null;
  caption?: string | null;
  description?: string | null;
};

export type TableRegionInput = {
  id: string;
  bbox: number[];
};

const FIGURE_LABELS = new Set([
  "figure",
  "picture",
  "image",
  "photo",
  "chart",
  "graph",
]);

const TABLE_LABELS = new Set(["table"]);

const FORMULA_LABELS = new Set([
  "formula",
  "equation",
  "code",
  "math",
]);

function normalizeLabel(region: RegionWire): string {
  const raw =
    region.docling_label ??
    region.provider_label ??
    region.label ??
    "";
  return raw.toLowerCase().replace(/\s+/g, "_");
}

export function regionLabelKind(
  region: RegionWire,
): "figure" | "table" | "formula" | "text" | "other" {
  const label = normalizeLabel(region);
  if (FIGURE_LABELS.has(label) || label.includes("picture") || label.includes("figure")) {
    return "figure";
  }
  if (TABLE_LABELS.has(label) || label.includes("table")) {
    return "table";
  }
  if (FORMULA_LABELS.has(label) || label.includes("formula") || label.includes("code")) {
    return "formula";
  }
  if (label.includes("text") || label.includes("title") || label.includes("paragraph")) {
    return "text";
  }
  return "other";
}

export function regionToFigure(region: RegionWire): FigureWire {
  return {
    id: region.id,
    bbox: region.bbox,
    category: normalizeLabel(region) || null,
  };
}

export function regionToTableInput(region: RegionWire): TableRegionInput {
  return {
    id: region.id,
    bbox: region.bbox,
  };
}

export function regionsToFigures(regions: RegionWire[]): FigureWire[] {
  return regions
    .filter((r) => regionLabelKind(r) === "figure")
    .map(regionToFigure);
}

export function regionsToTableInputs(regions: RegionWire[]): TableRegionInput[] {
  return regions
    .filter((r) => regionLabelKind(r) === "table")
    .map(regionToTableInput);
}

export function getRegionWireKind(region: RegionWire): WireKind {
  const kind = regionLabelKind(region);
  switch (kind) {
    case "figure":
      return "figure_array";
    case "table":
      return "table_structure_array";
    case "formula":
      return "formula_array";
    default:
      return "page_artifact_regions";
  }
}

export function adaptOutputForInput(
  output: NodeCachedOutput | null,
  requiredInput: WireKind,
): NodeCachedOutput | null {
  if (!output) return null;

  if (requiredInput === "figure_array") {
    if (output.kind === "figures") return output;
    if (output.kind === "regions") {
      const regions = (output.raw as { regions?: RegionWire[] }).regions ?? [];
      const figures =
        regions.length === 1
          ? [regionToFigure(regions[0])]
          : regionsToFigures(regions);
      if (!figures.length) return null;
      return {
        kind: "figures",
        raw: {
          ...(output.raw as object),
          figures,
        },
        preview: {
          ...output.preview,
          itemCount: figures.length,
        },
      };
    }
  }

  if (requiredInput === "table_structure_array") {
    if (output.kind === "tables") return output;
    if (output.kind === "regions") {
      const regions = (output.raw as { regions?: RegionWire[] }).regions ?? [];
      const tables =
        regions.length === 1 && regionLabelKind(regions[0]) === "table"
          ? [regionToTableInput(regions[0])]
          : regionsToTableInputs(regions);
      if (!tables.length) return null;
      return {
        kind: "tables",
        raw: {
          ...(output.raw as object),
          tables,
        },
        preview: {
          ...output.preview,
          itemCount: tables.length,
        },
      };
    }
  }

  if (requiredInput === "formula_array" && output.kind === "regions") {
    const regions = (output.raw as { regions?: RegionWire[] }).regions ?? [];
    const formulas = regions
      .filter((r) => regionLabelKind(r) === "formula")
      .map((r) => ({ id: r.id, bbox: r.bbox, latex: "" }));
    if (!formulas.length) return output;
    return {
      kind: "formulas",
      raw: {
        ...(output.raw as object),
        formulas,
      },
      preview: {
        ...output.preview,
        itemCount: formulas.length,
      },
    };
  }

  return output;
}

export function resolveUpstreamOutput(
  output: NodeCachedOutput | null,
  sourceHandle: string | null | undefined,
  requiredInput?: WireKind,
): NodeCachedOutput | null {
  const sliced = sliceOutputByHandle(output, sourceHandle);
  if (!sliced) return null;
  if (!requiredInput) return sliced;
  return adaptOutputForInput(sliced, requiredInput) ?? sliced;
}

export function getItemWireKindFromOutput(
  output: NodeCachedOutput | null,
  sourceHandle: string | null | undefined,
): WireKind | null {
  if (!output) return null;
  const sliced = sliceOutputByHandle(output, sourceHandle);
  if (!sliced) return null;

  switch (sliced.kind) {
    case "pages":
      return "page_artifact_array";
    case "page":
      return "page_artifact";
    case "regions": {
      const regions = (sliced.raw as { regions?: RegionWire[] }).regions ?? [];
      if (regions.length === 1) {
        return getRegionWireKind(regions[0]);
      }
      return "page_artifact_regions";
    }
    case "lines":
      return "text_line_array";
    case "figures":
      return "figure_array";
    case "tables":
      return "table_structure_array";
    case "formulas":
      return "formula_array";
    case "reading_order":
      return "reading_order";
    case "document":
      return "document_artifact";
    default:
      return null;
  }
}
