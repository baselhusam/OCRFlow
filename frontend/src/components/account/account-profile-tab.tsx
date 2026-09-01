"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, BadgeCheck, UserRound } from "lucide-react";

import { AppToast } from "@/components/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/api/account";
import type { User } from "@/lib/api/client";
import { getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";

type AccountProfileTabProps = {
  user: User;
};

export function AccountProfileTab({ user }: AccountProfileTabProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  function handleCancel() {
    setFullName(user.full_name ?? "");
    setDisplayName(user.display_name ?? "");
    setBio(user.bio ?? "");
  }

  async function handleSave() {
    setIsSaving(true);
    setToast(null);
    try {
      const response = await updateProfile({
        full_name: fullName.trim() || null,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to save profile");
      }
      router.refresh();
      setToast({
        message: "Changes saved successfully.",
        variant: "success",
      });
    } catch (saveError) {
      setToast({
        message:
          saveError instanceof Error ? saveError.message : "Failed to save profile",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {toast ? (
        <AppToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    <section className={cn(dashboardStatCardClassName, "overflow-hidden")}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="size-4" aria-hidden />
            </span>
            <h2 className="font-bold tracking-[-0.02em] text-foreground">Profile details</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep the identity your workspace recognizes up to date.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <BadgeCheck className="size-3.5" aria-hidden />
          Active account
        </span>
      </div>

      <div className="grid gap-x-6 gap-y-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
        <div>
          <Label htmlFor="full-name" className="text-[13px] font-semibold">
            Full name
          </Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-2 h-11 bg-background"
          />
        </div>
        <div>
          <Label htmlFor="display-name" className="text-[13px] font-semibold">
            Display name
          </Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-2 h-11 bg-background"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-[13px] font-semibold">
            <span className="flex items-center gap-1.5"><AtSign className="size-3.5 text-muted-foreground" aria-hidden /> Email</span>
          </Label>
          <Input
            id="email"
            value={user.email}
            readOnly
            className="mt-2 h-11 bg-secondary/30 font-mono text-[13px]"
          />
        </div>
        <div>
          <Label className="text-[13px] font-semibold">Role</Label>
          <div className="mt-2 flex h-11 items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 text-sm text-muted-foreground">
            <span>{getRoleLabel(user.role)}</span>
            <span className="font-mono text-[11px]">set by workspace owner</span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bio" className="text-[13px] font-semibold">
            Bio
          </Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            placeholder="Tell your team what you work on…"
            className={cn(
              "mt-2 flex min-h-[112px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/25 px-5 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">Changes apply to your workspace profile.</p>
        <div className="flex gap-3">
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        </div>
      </div>
    </section>
    </>
  );
}
