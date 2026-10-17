/** Whole-document converters: a file in, a DocumentArtifact out (never per page). */
const DOCUMENT_CONVERTER_MODELS = new Set([
  "docling/convert-pipeline",
  "docling/vlm-granite-docling",
  "unlimited/multi-page-parse",
]);

export function isDocumentConverterNode(modelId: string): boolean {
  return DOCUMENT_CONVERTER_MODELS.has(modelId);
}
