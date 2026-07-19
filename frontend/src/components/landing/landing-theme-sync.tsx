"use client";

import { useEffect } from "react";

import { useTheme } from "@/components/providers/theme-provider";
import {
  DEFAULT_THEME,
  LANDING_THEME,
  STORAGE_KEY,
  type ThemeSetting,
} from "@/lib/theme-init";

export function LandingThemeSync() {
  const { setThemeEphemeral } = useTheme();

  useEffect(() => {
    setThemeEphemeral(LANDING_THEME);

    return () => {
      const stored =
        (localStorage.getItem(STORAGE_KEY) as ThemeSetting | null) ?? DEFAULT_THEME;
      setThemeEphemeral(stored);
    };
  }, [setThemeEphemeral]);

  return null;
}
