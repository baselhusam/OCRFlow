"use client";

import { useEffect } from "react";

import {
  syncThemeFromPreferences,
  useTheme,
  type ThemeSetting,
} from "@/components/providers/theme-provider";
import type { User } from "@/lib/api/client";

type UserThemeSyncProps = {
  user: User;
};

export function UserThemeSync({ user }: UserThemeSyncProps) {
  const { setTheme } = useTheme();
  const appearance = user.preferences?.appearance ?? "dark";

  useEffect(() => {
    syncThemeFromPreferences(appearance as ThemeSetting);
    setTheme(appearance as ThemeSetting);
  }, [appearance, setTheme]);

  return null;
}
