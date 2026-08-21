"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  applyThemeClass,
  DEFAULT_THEME,
  isLandingPath,
  LANDING_THEME,
  resolveTheme,
  STORAGE_KEY,
  type ResolvedTheme,
  type ThemeSetting,
} from "@/lib/theme-init";

export type { ThemeSetting } from "@/lib/theme-init";

type ThemeContextValue = {
  theme: ThemeSetting | undefined;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: Dispatch<SetStateAction<ThemeSetting>>;
  setThemeEphemeral: (setting: ThemeSetting) => void;
  themes: ThemeSetting[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting | undefined>(undefined);

  useEffect(() => {
    const stored =
      (localStorage.getItem(STORAGE_KEY) as ThemeSetting | null) ?? DEFAULT_THEME;
    const initial = isLandingPath(window.location.pathname) ? LANDING_THEME : stored;
    setThemeState(initial);
  }, []);

  useEffect(() => {
    if (theme === undefined) return;

    const resolved = resolveTheme(theme);
    applyThemeClass(resolved);

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemeClass(resolveTheme("system"));
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const setThemeEphemeral = useCallback((setting: ThemeSetting) => {
    setThemeState(setting);
    applyThemeClass(resolveTheme(setting));
  }, []);

  const setTheme = useCallback<Dispatch<SetStateAction<ThemeSetting>>>(
    (next) => {
      setThemeState((current) => {
        const resolvedSetting =
          typeof next === "function"
            ? next(current ?? DEFAULT_THEME)
            : next;

        try {
          localStorage.setItem(STORAGE_KEY, resolvedSetting);
        } catch {
          // Ignore storage failures
        }

        applyThemeClass(resolveTheme(resolvedSetting));
        return resolvedSetting;
      });
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme ? resolveTheme(theme) : undefined,
      setTheme,
      setThemeEphemeral,
      themes: ["system", "light", "dark"],
    }),
    [theme, setTheme, setThemeEphemeral],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: undefined,
      resolvedTheme: undefined,
      setTheme: () => {},
      setThemeEphemeral: () => {},
      themes: ["system", "light", "dark"],
    };
  }

  return context;
}

export function syncThemeFromPreferences(appearance: ThemeSetting) {
  try {
    localStorage.setItem(STORAGE_KEY, appearance);
    applyThemeClass(resolveTheme(appearance));
  } catch {
    // Ignore storage failures
  }
}
