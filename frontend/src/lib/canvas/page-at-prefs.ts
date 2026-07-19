const PAGE_AT_HINT_KEY = "ocrflow-page-at-hint-dismissed";

export function readPageAtHintDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PAGE_AT_HINT_KEY) === "true";
  } catch {
    return false;
  }
}

export function writePageAtHintDismissed(dismissed: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAGE_AT_HINT_KEY, String(dismissed));
  } catch {
    // ignore quota / private mode
  }
}
