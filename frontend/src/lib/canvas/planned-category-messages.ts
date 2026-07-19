import { PLANNED_CATEGORIES } from "@/lib/canvas/planned-categories";

const PLANNED_CATEGORY_MESSAGES: Record<string, string> = {
  preprocess:
    "Image preprocessing (deskew, binarize) is planned. Connect a page loader upstream to preview input pages.",
  table_detection:
    "Table detection (TATR) is planned. Will detect tabular regions from layout output.",
  table_cell_ocr:
    "Table cell OCR is planned. Will fill cell text from table structure input.",
  formula_detection:
    "Formula detection is planned. Will locate math regions on the page.",
  llm_extract:
    "LLM structured extract is planned. Will accept DocumentArtifact and return validated JSON.",
  export:
    "Export nodes are planned. Will convert DocumentArtifact to Markdown or JSON files.",
};

export function getPlannedCategoryMessage(category: string): string {
  return (
    PLANNED_CATEGORY_MESSAGES[category] ??
    "This model is not yet available for canvas runs."
  );
}

export function isPlannedCategory(category: string): boolean {
  return PLANNED_CATEGORIES.has(category);
}
