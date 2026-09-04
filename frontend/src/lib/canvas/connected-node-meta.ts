/** Metadata shared by the branded external LLM/VLM canvas nodes. */
export const CONNECTED_PROTOCOLS = [
  "openai",
  "anthropic",
  "openai-compatible",
  "anthropic-compatible",
] as const;

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
