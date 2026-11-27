"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const FOLD_KEY = "ocrflow-library-folds";
const FOLD_EVENT = "ocrflow-library-folds-change";
const EMPTY = "{}";

/** In-memory mirror so folding still works when storage is unavailable. */
let memorySnapshot = EMPTY;

function readSnapshot(): string {
  try {
    return window.localStorage.getItem(FOLD_KEY) ?? memorySnapshot;
  } catch {
    return memorySnapshot;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FOLD_KEY) onChange();
  };
  window.addEventListener(FOLD_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(FOLD_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(snapshot: string): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(snapshot);
    return value && typeof value === "object" ? (value as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Folded (closed) section ids, persisted in localStorage. The server snapshot
 * is "nothing folded" so SSR and first client render agree.
 */
export function useSectionFolds(): {
  isFolded: (sectionId: string) => boolean;
  toggleFold: (sectionId: string) => void;
} {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
  const folds = useMemo(() => parse(snapshot), [snapshot]);

  const isFolded = useCallback((sectionId: string) => folds[sectionId] === true, [folds]);

  const toggleFold = useCallback((sectionId: string) => {
    const next = parse(readSnapshot());
    if (next[sectionId]) delete next[sectionId];
    else next[sectionId] = true;
    memorySnapshot = JSON.stringify(next);
    try {
      window.localStorage.setItem(FOLD_KEY, memorySnapshot);
    } catch {
      // Storage unavailable (private mode, quota) — fold state just won't persist.
    }
    window.dispatchEvent(new Event(FOLD_EVENT));
  }, []);

  return { isFolded, toggleFold };
}
