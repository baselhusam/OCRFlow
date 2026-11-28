export type ModelProtocol = "openai" | "anthropic" | "openai-compatible" | "anthropic-compatible" | "openrouter";
export type ModelConnectionStatus = "ready" | "authentication_required" | "incompatible" | "unreachable" | "blocked";
/** A hosted model that reads page images (image in, text out). Prices are USD per million tokens. */
export type OcrModel = {
  id: string;
  name: string;
  description: string | null;
  context_length: number | null;
  prompt_price: number | null;
  completion_price: number | null;
  structured_outputs: boolean;
  free: boolean;
  document_focused: boolean;
};
export type ModelConnectionValidation = { status: ModelConnectionStatus; detail: string; discovered_models: string[]; ocr_models?: OcrModel[]; authentication_required: boolean };
export type ModelConnection = { id: string; name: string; protocol: ModelProtocol; base_url: string; text_model: string | null; vision_model: string | null; has_api_key: boolean; enabled: boolean; last_validation: ModelConnectionValidation | null; enabled_models: string[]; last_checked_at: string | null; created_at: string; updated_at: string };
export type ModelConnectionInput = { name: string; protocol: ModelProtocol; base_url: string; api_key?: string; text_model?: string; vision_model?: string; enabled: boolean };
/** OCR models on validated connections, readable by every signed-in user. */
export type OcrCatalogConnection = { connection_id: string; connection_name: string; protocol: ModelProtocol; models: OcrModel[] };
export type OcrCatalog = { connections: OcrCatalogConnection[] };

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** "$0.20 / $0.80 per 1M tokens", "Free", or null when the provider hides pricing. */
export function formatOcrModelPrice(model: Pick<OcrModel, "free" | "prompt_price" | "completion_price">): string | null {
  if (model.free) return "Free";
  if (model.prompt_price == null && model.completion_price == null) return null;
  const money = (value: number | null) => (value == null ? "?" : `$${value < 0.1 ? value.toFixed(3) : value.toFixed(2)}`);
  return `${money(model.prompt_price)} in · ${money(model.completion_price)} out / 1M`;
}

/** "Qwen: Qwen2.5 VL 72B" -> "Qwen2.5 VL 72B" (the vendor shows separately). */
export function shortOcrModelName(name: string): string {
  const index = name.indexOf(": ");
  return index > 0 ? name.slice(index + 2) : name;
}

/** "qwen/qwen2.5-vl-72b" -> "qwen". */
export function ocrModelVendor(id: string): string {
  return id.split("/", 1)[0] ?? id;
}
