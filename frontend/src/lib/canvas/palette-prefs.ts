const PALETTE_PREFS_KEY = "ocrflow-palette-sections";
const PALETTE_COLLAPSED_KEY = "ocrflow-palette-collapsed";
const PALETTE_PREFS_EVENT = "ocrflow-palette-sections-change";
const EMPTY_PALETTE_PREFS = "{}";

export function readPaletteCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PALETTE_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writePaletteCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PALETTE_COLLAPSED_KEY, String(collapsed));
}

export function readPaletteSectionPrefs(): Record<string, boolean> {
  return parsePaletteSectionPrefs(readPaletteSectionPrefsSnapshot());
}

export function readPaletteSectionPrefsSnapshot(): string {
  if (typeof window === "undefined") return EMPTY_PALETTE_PREFS;
  try {
    const raw = window.localStorage.getItem(PALETTE_PREFS_KEY);
    return raw ?? EMPTY_PALETTE_PREFS;
  } catch {
    return EMPTY_PALETTE_PREFS;
  }
}

export function subscribePaletteSectionPrefs(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PALETTE_PREFS_KEY) onChange();
  };

  window.addEventListener(PALETTE_PREFS_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PALETTE_PREFS_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function parsePaletteSectionPrefs(
  snapshot: string,
): Record<string, boolean> {
  try {
    return JSON.parse(snapshot) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function writePaletteSectionPref(categoryId: string, open: boolean) {
  if (typeof window === "undefined") return;
  const prefs = readPaletteSectionPrefs();
  prefs[categoryId] = open;
  window.localStorage.setItem(PALETTE_PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(PALETTE_PREFS_EVENT));
}

export function defaultSectionOpen(
  categoryId: string,
  index: number,
): boolean {
  const prefs = readPaletteSectionPrefs();
  if (categoryId in prefs) return prefs[categoryId] ?? false;
  return index < 3;
}
