import type { WireKind } from "@/lib/canvas/wire-types";

/**
 * Data families for pins and wires. Every WireKind folds into one family so a
 * user only has to learn ~8 colours: blue = pages, amber = regions, green =
 * text, and so on. Pins, wires, the connection ghost and the inspector's
 * connection list all read from here.
 */
export type WireFamily =
  | "pages"
  | "regions"
  | "text"
  | "tables"
  | "formulas"
  | "figures"
  | "document"
  | "json"
  | "file"
  | "unknown";

type FamilyMeta = {
  label: string;
  /** One-line plain-language description, used in pin tooltips. */
  hint: string;
  color: string;
};

export const WIRE_FAMILY_META: Record<WireFamily, FamilyMeta> = {
  pages: { label: "Pages", hint: "Page images from a document", color: "#4f9cf9" },
  regions: { label: "Regions", hint: "Page with detected layout boxes", color: "#f5a524" },
  text: { label: "Text", hint: "Recognised text lines or plain text", color: "#2ccf8f" },
  tables: { label: "Tables", hint: "Table structure with cells", color: "#ff7a45" },
  formulas: { label: "Formulas", hint: "Formula crops and LaTeX", color: "#f0619b" },
  figures: { label: "Figures", hint: "Figures and pictures on the page", color: "#22c3c3" },
  document: { label: "Document", hint: "A whole converted document (Markdown + structure)", color: "#a78bfa" },
  json: { label: "JSON", hint: "Structured data fields", color: "#e2c043" },
  file: { label: "File", hint: "An exported file", color: "#9a95b5" },
  unknown: { label: "Data", hint: "Untyped data", color: "#767a85" },
};

const KIND_TO_FAMILY: Record<WireKind, WireFamily> = {
  none: "unknown",
  file: "pages",
  document_input: "pages",
  page_artifact: "pages",
  page_artifact_array: "pages",
  page_artifact_regions: "regions",
  reading_order: "regions",
  text_line_array: "text",
  text: "text",
  table_structure_array: "tables",
  formula_array: "formulas",
  figure_array: "figures",
  document_artifact: "document",
  json: "json",
  file_export: "file",
};

/** Finer label for the exact kind (pin tooltip second line). */
const KIND_LABELS: Record<WireKind, string> = {
  none: "Nothing",
  file: "Document + pages",
  document_input: "Document file",
  page_artifact: "One page",
  page_artifact_array: "Pages",
  page_artifact_regions: "Page + layout regions",
  reading_order: "Reading order",
  text_line_array: "Text lines",
  text: "Text",
  table_structure_array: "Tables",
  formula_array: "Formulas",
  figure_array: "Figures",
  document_artifact: "Document",
  json: "JSON",
  file_export: "File",
};

export function wireFamily(kind: WireKind | null | undefined): WireFamily {
  if (!kind) return "unknown";
  return KIND_TO_FAMILY[kind] ?? "unknown";
}

export function wireColor(kind: WireKind | null | undefined): string {
  return WIRE_FAMILY_META[wireFamily(kind)].color;
}

export function wireKindLabel(kind: WireKind | null | undefined): string {
  if (!kind) return "Data";
  return KIND_LABELS[kind] ?? "Data";
}

export function wireKindHint(kind: WireKind | null | undefined): string {
  return WIRE_FAMILY_META[wireFamily(kind)].hint;
}
