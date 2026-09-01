export type EngineProvider = "docling" | "surya" | "paddle";
export type EngineAuthType = "none" | "bearer" | "x-api-key";
export type EngineStatus =
  | "ready"
  | "partial"
  | "authentication_required"
  | "incompatible"
  | "unreachable";

export type EngineModelCheck = {
  model_id: string;
  available: boolean;
  message: string | null;
};

export type EngineValidation = {
  status: EngineStatus;
  detail: string;
  provider: string | null;
  api_version: string | null;
  engine_version: string | null;
  authentication_required: boolean;
  model_checks: EngineModelCheck[];
};

export type OcrEngine = {
  id: string;
  name: string;
  provider: EngineProvider;
  base_url: string;
  auth_type: EngineAuthType;
  has_api_key: boolean;
  enabled: boolean;
  last_validation: EngineValidation | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OcrEngineList = { items: OcrEngine[] };

export type EngineInput = {
  name: string;
  provider: EngineProvider;
  base_url: string;
  auth_type: EngineAuthType;
  api_key?: string;
  enabled: boolean;
};
