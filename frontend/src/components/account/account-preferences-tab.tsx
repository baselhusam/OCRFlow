"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppToast } from "@/components/app-toast";
import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";
import {
  syncThemeFromPreferences,
  useTheme,
  type ThemeSetting,
} from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updatePreferences } from "@/lib/api/account";
import type { User, UserPreferences } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type AccountPreferencesTabProps = {
  user: User;
};

const THEME_OPTIONS: { key: ThemeSetting; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export function AccountPreferencesTab({ user }: AccountPreferencesTabProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [prefs, setPrefs] = useState<UserPreferences>(user.preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  function updatePref<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
    if (key === "appearance") {
      setTheme(value as ThemeSetting);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setToast(null);
    try {
      const response = await updatePreferences(prefs);
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to save preferences");
      }
      syncThemeFromPreferences(prefs.appearance);
      router.refresh();
      setToast({
        message: "Preferences saved successfully.",
        variant: "success",
      });
    } catch (saveError) {
      setToast({
        message:
          saveError instanceof Error ? saveError.message : "Failed to save preferences",
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
    <div className="mt-8 flex max-w-[680px] flex-col gap-3.5">
      <div
        className={cn(
          dashboardStatCardClassName,
          "flex flex-wrap items-center justify-between gap-4 p-5",
        )}
      >
        <div>
          <p className="text-[15px] font-semibold text-foreground">Appearance</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            How OCRFlow looks on this device.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-secondary/80 p-0.5">
          {THEME_OPTIONS.map((option) => {
            const active = prefs.appearance === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => updatePref("appearance", option.key)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          dashboardStatCardClassName,
          "flex flex-wrap items-center justify-between gap-4 p-5",
        )}
      >
        <div>
          <p className="text-[15px] font-semibold text-foreground">Default output format</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Applied to new extract nodes.
          </p>
        </div>
        <Select
          value={prefs.default_output_format}
          onValueChange={(value) => {
            if (value) {
              updatePref(
                "default_output_format",
                value as UserPreferences["default_output_format"],
              );
            }
          }}
        >
          <SelectTrigger className="min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          dashboardStatCardClassName,
          "flex flex-wrap items-center justify-between gap-4 p-5",
        )}
      >
        <div>
          <p className="text-[15px] font-semibold text-foreground">Default OCR model</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Used by new Recognize Text nodes.
          </p>
        </div>
        <Select
          value={prefs.default_ocr_model}
          onValueChange={(value) => {
            if (value) updatePref("default_ocr_model", value);
          }}
        >
          <SelectTrigger className="min-w-[160px] font-mono text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ocrflow-base v2.4">ocrflow-base v2.4</SelectItem>
            <SelectItem value="docling/ocr-auto">docling/ocr-auto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={cn(dashboardStatCardClassName, "px-5 py-1.5")}>
        <PreferenceToggle
          label="Auto-run on upload"
          description="Start the pipeline as soon as a file lands."
          checked={prefs.auto_run_on_upload}
          onCheckedChange={(checked) => updatePref("auto_run_on_upload", checked)}
        />
        <PreferenceToggle
          label="Email me when a run fails"
          description="Get notified about failed executions."
          checked={prefs.email_on_run_fail}
          onCheckedChange={(checked) => updatePref("email_on_run_fail", checked)}
          bordered
        />
        <PreferenceToggle
          label="Weekly summary"
          description="A digest of runs and usage every Monday."
          checked={prefs.weekly_summary}
          onCheckedChange={(checked) => updatePref("weekly_summary", checked)}
        />
      </div>

      <div>
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
    </>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onCheckedChange,
  bordered = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-4",
        bordered && "border-b border-border/70",
      )}
    >
      <div>
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
