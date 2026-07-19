/** Human-readable wire type labels for UI display only. */

const WIRE_LABEL_MAP: Record<string, string> = {
  File: "File",
  DocumentInput: "File",
  PageArtifact: "Image",
  "PageArtifact[]": "Images",
  "PageArtifact + regions": "Image + Boxes",
  "TextLine[]": "Text",
  "TextLine[] (with text)": "Text",
  reading_order: "Reading order",
  "TableStructure[]": "Tables",
  "Formula[]": "Formulas",
  "Formula[] (with LaTeX)": "Formulas",
  "Figure[]": "Figures",
  "Figure[] (with caption)": "Figures",
  DocumentArtifact: "Document",
  "DocumentArtifact + markdown": "Document",
  JSON: "JSON",
};

const ARTIFACT_KIND_MAP: Record<string, string> = {
  pages: "Images",
  page: "Image",
  regions: "Bounding boxes",
  lines: "Text",
  reading_order: "Reading order",
  tables: "Tables",
  formulas: "Formulas",
  figures: "Figures",
  document: "Document",
  json: "JSON",
};

export function formatWireLabel(label: string): string {
  if (!label || label === "unknown") return label;
  const direct = WIRE_LABEL_MAP[label];
  if (direct) return direct;

  const lower = label.toLowerCase();
  for (const [key, value] of Object.entries(WIRE_LABEL_MAP)) {
    if (key.toLowerCase() === lower) return value;
  }

  return label;
}

export function formatArtifactKind(kind: string): string {
  return ARTIFACT_KIND_MAP[kind] ?? kind;
}
