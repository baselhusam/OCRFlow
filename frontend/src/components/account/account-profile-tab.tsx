"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppToast } from "@/components/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/api/account";
import type { User } from "@/lib/api/client";
import { getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

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
    <div className="mt-8 max-w-[680px]">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="full-name" className="text-[13px] font-semibold">
            Full name
          </Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-2 h-11"
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
            className="mt-2 h-11"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-[13px] font-semibold">
            Email
          </Label>
          <Input
            id="email"
            value={user.email}
            readOnly
            className="mt-2 h-11 font-mono text-[13px]"
          />
        </div>
        <div>
          <Label className="text-[13px] font-semibold">Role</Label>
          <div className="mt-2 flex h-11 items-center justify-between rounded-md border border-border bg-secondary/40 px-3 text-sm text-muted-foreground">
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
              "mt-2 flex min-h-[96px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
    </>
  );
}
