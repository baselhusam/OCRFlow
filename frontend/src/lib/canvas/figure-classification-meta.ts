export const FIGURE_CLASSIFICATION_MODEL_IDS = new Set([
  "docling/picture-classifier-v2.5",
]);

export function isFigureClassificationNode(
  modelId: string,
  category?: string,
): boolean {
  return (
    FIGURE_CLASSIFICATION_MODEL_IDS.has(modelId) ||
    category === "figure_classification"
  );
}

export function formatClassificationLabel(category: string): string {
  return category
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
