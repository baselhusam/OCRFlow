export type UserRole = "admin" | "view_admin" | "developer" | "user";

export type ApiKey = {
  id: string;
  owner_id: string;
  owner_email: string | null;
  name: string;
  key_prefix: string;
  allowed_pipeline_ids: string[];
  allowed_pipeline_names: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  request_count: number;
  document_count: number;
  successful_requests: number;
  failed_requests: number;
};

export type ApiKeyCreated = ApiKey & { key: string };
export type ApiKeyList = { items: ApiKey[] };
export type ApiKeyUsageItem = {
  id: string; api_key_id: string; pipeline_id: string | null; pipeline_name: string | null; endpoint: string;
  method: string; status_code: number; outcome: "success" | "error";
  document_count: number; page_count: number; error_code: string | null; created_at: string;
};
export type ApiKeyUsageSummary = {
  request_count: number; document_count: number; successful_requests: number;
  failed_requests: number; last_used_at: string | null; timeline: ApiKeyUsageItem[];
};

export async function createApiKey(payload: { name: string }): Promise<Response> {
  return fetch("/api/account/api-keys", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export async function revokeApiKey(keyId: string): Promise<Response> {
  return fetch(`/api/account/api-keys/${keyId}`, { method: "DELETE" });
}

export type UserPreferences = {
  appearance: "system" | "light" | "dark";
  default_output_format: "json" | "csv" | "markdown";
  default_ocr_model: string;
  auto_run_on_upload: boolean;
  email_on_run_fail: boolean;
  weekly_summary: boolean;
};

export type UserProfileUpdate = {
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
};

export type UserPreferencesUpdate = Partial<UserPreferences>;

export type Member = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MemberList = {
  items: Member[];
};

export type MemberUpdate = {
  role?: UserRole;
  is_active?: boolean;
};

export async function updateProfile(payload: UserProfileUpdate): Promise<Response> {
  return fetch("/api/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updatePreferences(
  payload: UserPreferencesUpdate,
): Promise<Response> {
  return fetch("/api/account/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getMembers(): Promise<Response> {
  return fetch("/api/members");
}

export async function updateMember(
  userId: string,
  payload: MemberUpdate,
): Promise<Response> {
  return fetch(`/api/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
