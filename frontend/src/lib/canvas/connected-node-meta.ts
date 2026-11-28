/** Metadata shared by the branded external LLM/VLM canvas nodes. */
export const CONNECTED_PROTOCOLS = [
  "openai",
  "anthropic",
  "openai-compatible",
  "anthropic-compatible",
  "openrouter",
] as const;

/**
 * One OCR node backs every OpenRouter vision model: the library lists each
 * discovered model as a preset of this node (`params.model`).
 */
export const OPENROUTER_OCR_MODEL_ID = "openrouter/ocr";

export function isOpenRouterOcrModel(modelId: string): boolean {
  return modelId === OPENROUTER_OCR_MODEL_ID;
}

export type ConnectedProtocol = (typeof CONNECTED_PROTOCOLS)[number];

export const CONNECTED_OPERATIONS = [
  "text-prompt",
  "structured-extract",
  "vision-prompt",
  "vision-structured-extract",
] as const;

export type ConnectedOperation = (typeof CONNECTED_OPERATIONS)[number];

export function getConnectedProtocol(modelId: string): ConnectedProtocol | null {
  const provider = modelId.split("/", 1)[0] as ConnectedProtocol;
  return CONNECTED_PROTOCOLS.includes(provider) ? provider : null;
}

export function getConnectedOperation(modelId: string): ConnectedOperation | null {
  const operation = modelId.split("/")[1] as ConnectedOperation;
  return CONNECTED_OPERATIONS.includes(operation) ? operation : null;
}

export function isConnectedModel(modelId: string): boolean {
  return getConnectedProtocol(modelId) !== null;
}

export function isConnectedVisionModel(modelId: string): boolean {
  if (isOpenRouterOcrModel(modelId)) return true;
  return getConnectedOperation(modelId)?.startsWith("vision-") ?? false;
}

export function isConnectedStructuredModel(modelId: string): boolean {
  return getConnectedOperation(modelId) === "structured-extract" ||
    getConnectedOperation(modelId) === "vision-structured-extract";
}

export function connectedNodeIds(): string[] {
  return CONNECTED_PROTOCOLS.flatMap((protocol) =>
    CONNECTED_OPERATIONS.map((operation) => `${protocol}/${operation}`),
  );
}

/** One-line caption for an OpenRouter OCR node: the chosen model's name. */
export function openRouterModelCaption(
  params: Record<string, string | boolean | number | undefined>,
): string {
  const label = String(params.model_label ?? "").trim();
  const model = String(params.model ?? "").trim();
  return label || model || "Choose an OpenRouter model";
}
