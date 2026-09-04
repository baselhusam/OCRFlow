export type ModelProtocol = "openai" | "anthropic" | "openai-compatible" | "anthropic-compatible";
export type ModelConnectionStatus = "ready" | "authentication_required" | "incompatible" | "unreachable" | "blocked";
export type ModelConnectionValidation = { status: ModelConnectionStatus; detail: string; discovered_models: string[]; authentication_required: boolean };
export type ModelConnection = { id: string; name: string; protocol: ModelProtocol; base_url: string; text_model: string | null; vision_model: string | null; has_api_key: boolean; enabled: boolean; last_validation: ModelConnectionValidation | null; last_checked_at: string | null; created_at: string; updated_at: string };
export type ModelConnectionInput = { name: string; protocol: ModelProtocol; base_url: string; api_key?: string; text_model?: string; vision_model?: string; enabled: boolean };
