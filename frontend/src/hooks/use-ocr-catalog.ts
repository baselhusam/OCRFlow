"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { OcrCatalog, OcrCatalogConnection, OcrModel } from "@/lib/api/model-connections";

/**
 * OCR models discovered on validated connections (OpenRouter today).
 *
 * One shared store for the library, inspector and quick settings: the catalog
 * holds hundreds of entries, so it is fetched once, then refreshed on window
 * focus (e.g. after adding a connection in Configuration in another tab).
 */

type CatalogState = { status: "idle" | "loading" | "ready" | "error"; connections: OcrCatalogConnection[] };

const EMPTY: CatalogState = { status: "idle", connections: [] };
const MIN_REFRESH_MS = 15_000;

let state: CatalogState = EMPTY;
let lastFetch = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: CatalogState) {
  state = next;
  for (const listener of listeners) listener();
}

export function refreshOcrCatalog(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && state.status === "ready" && Date.now() - lastFetch < MIN_REFRESH_MS) {
    return Promise.resolve();
  }
  if (state.status === "idle") emit({ ...state, status: "loading" });
  lastFetch = Date.now();
  inflight = fetch("/api/models/ocr-catalog", { cache: "no-store", credentials: "include" })
    .then(async (response) => {
      if (!response.ok) throw new Error("catalog unavailable");
      const body = (await response.json()) as OcrCatalog;
      emit({ status: "ready", connections: body.connections ?? [] });
    })
    .catch(() => {
      emit({ status: "error", connections: state.connections });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOcrCatalog(): CatalogState {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  useEffect(() => {
    void refreshOcrCatalog();
    const onFocus = () => void refreshOcrCatalog();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return snapshot;
}

/** Find a model on a specific connection (or any connection when id is empty). */
export function findOcrModel(
  connections: OcrCatalogConnection[],
  modelId: string,
  connectionId?: string,
): OcrModel | undefined {
  for (const connection of connections) {
    if (connectionId && connection.connection_id !== connectionId) continue;
    const match = connection.models.find((model) => model.id === modelId);
    if (match) return match;
  }
  return undefined;
}
