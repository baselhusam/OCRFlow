export const STORAGE_KEY = "theme";
export const DEFAULT_THEME = "dark";
export const LANDING_THEME = "light";

export type ThemeSetting = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function isLandingPath(pathname: string) {
  return pathname === "/" || pathname === "";
}

export function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  return theme;
}

export function applyThemeClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,p=location.pathname,isLanding=!p||p==="/";var t=isLanding?"light":(localStorage.getItem("${STORAGE_KEY}")||"${DEFAULT_THEME}");var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;if(r==="dark")d.classList.add("dark");else d.classList.remove("dark")}catch(e){}})();`;
