"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { updatePreferences } from "@/lib/api/account";

type ThemeToggleProps = {
  /** Also save the choice to the signed-in user's account preferences. */
  persistToAccount?: boolean;
};

export function ThemeToggle({ persistToAccount = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        className="border-border text-muted-foreground"
        aria-label="Toggle theme"
        disabled
      >
        <Moon className="opacity-40" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="border-border text-foreground hover:border-primary hover:text-primary"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        if (persistToAccount) {
          // Keep the server-side preference in step so UserThemeSync does not
          // revert the choice on the next full page load.
          void updatePreferences({ appearance: next }).catch(() => {});
        }
      }}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
