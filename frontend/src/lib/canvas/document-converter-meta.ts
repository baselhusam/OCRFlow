const DOCUMENT_CONVERTER_MODELS = new Set([
  "docling/convert-pipeline",
  "docling/vlm-granite-docling",
]);

export function isDocumentConverterNode(modelId: string): boolean {
  return DOCUMENT_CONVERTER_MODELS.has(modelId);
}
