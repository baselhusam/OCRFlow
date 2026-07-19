import type { User } from "@/lib/api/client";

export function getUserDisplayName(user: User): string {
  if (user.display_name?.trim()) {
    return user.display_name.trim();
  }

  if (user.full_name?.trim()) {
    return user.full_name.trim();
  }

  const localPart = user.email.split("@")[0] ?? user.email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export function getUserFirstName(user: User): string {
  const displayName = getUserDisplayName(user);
  return displayName.split(/\s+/)[0] ?? displayName;
}

export function getUserAvatarInitial(user: User): string {
  const source = user.full_name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
}
