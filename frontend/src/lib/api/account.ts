export type UserRole = "admin" | "view_admin" | "user";

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
