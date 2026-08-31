import { redirect } from "next/navigation";

import { AdminUsersTab } from "@/components/admin/admin-users-tab";
import type { AdminUserList } from "@/lib/api/admin";
import type { User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canAccessAdminPanel, canManageUsers } from "@/lib/auth/roles";

export default async function AdminUsersPage() {
  const { data: user } = await authenticatedApiFetch<User>("/api/v1/auth/me");

  if (!canAccessAdminPanel(user)) {
    redirect("/app");
  }

  const { data: userList } = await authenticatedApiFetch<AdminUserList>(
    "/api/v1/admin/users",
  );

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12">
      <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Admin</p>
      <div className="mt-3.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
            Users
          </h1>
          <p className="mt-3.5 max-w-[680px] text-base leading-relaxed text-muted-foreground">
            Review every account, its workspace activity, and the access it has to OCRFlow.
          </p>
        </div>
        <p className="rounded-full border border-border bg-secondary/35 px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          {userList.items.length} account{userList.items.length === 1 ? "" : "s"}
        </p>
      </div>
      <AdminUsersTab
        users={userList.items}
        canManage={canManageUsers(user)}
        currentUserId={user.id}
      />
    </main>
  );
}
