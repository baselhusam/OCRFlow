import type { User, UserRole } from "@/lib/api/client";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  view_admin: "View Admin",
  developer: "Developer",
  user: "User",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function canWrite(user: User): boolean {
  return user.role === "admin" || user.role === "developer" || user.role === "user";
}

export function canUseDeveloperApi(user: User): boolean {
  return user.role === "admin" || user.role === "developer";
}

export function canManageMembers(user: User): boolean {
  return user.role === "admin" || user.role === "view_admin";
}

export function canAccessAdminPanel(user: User): boolean {
  return canManageMembers(user);
}

export function canManageUsers(user: User): boolean {
  return user.role === "admin";
}

export function canChangeRoles(user: User): boolean {
  return user.role === "admin";
}

export function getRoleBadgeClassName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-primary/10 text-primary";
    case "view_admin":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "developer":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:
      return "bg-secondary text-muted-foreground";
  }
}
