"use client";

import { useEffect, useSyncExternalStore } from "react";

import { fetchRuntimeAvailability } from "@/lib/api/models";
import {
  REMOTE_PROVIDER_ORDER,
  providerDisplayName,
} from "@/lib/canvas/provider-availability";
import type { RuntimeAvailability } from "@/lib/canvas/types";

export type EngineStatus = {
  provider: string;
  name: string;
  online: boolean;
  detail: string | null;
};

export type EngineStatusState = {
  /** `loading` until the first probe resolves. */
  status: "loading" | "ready" | "error";
  engines: EngineStatus[];
  onlineCount: number;
  checkedAt: number | null;
};

const POLL_MS = 30_000;

const INITIAL: EngineStatusState = {
  status: "loading",
  engines: REMOTE_PROVIDER_ORDER.map((provider) => ({
    provider,
    name: providerDisplayName(provider),
    online: false,
    detail: null,
  })),
  onlineCount: 0,
  checkedAt: null,
};

// One shared store so the sidebar and dashboard never double-probe.
let state: EngineStatusState = INITIAL;
let inflight: Promise<void> | null = null;
let subscribers = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function emit(next: EngineStatusState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function toState(runtime: RuntimeAvailability | null): EngineStatusState {
  if (!runtime) {
    return { ...INITIAL, status: "error", checkedAt: Date.now() };
  }
  const byProvider = new Map(runtime.providers.map((p) => [p.provider, p]));
  const engines = REMOTE_PROVIDER_ORDER.map((provider) => {
    const entry = byProvider.get(provider);
    return {
      provider,
      name: providerDisplayName(provider),
      online: Boolean(entry?.running),
      detail: entry?.detail ?? null,
    };
  });
  return {
    status: "ready",
    engines,
    onlineCount: engines.filter((engine) => engine.online).length,
    checkedAt: Date.now(),
  };
}

export function refreshEngineStatus(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetchRuntimeAvailability()
    .then((runtime) => emit(toState(runtime)))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

/** Live status of the OCR engine services (Surya, Docling, Paddle, …). */
export function useEngineStatus(): EngineStatusState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    subscribers += 1;
    const stale = !state.checkedAt || Date.now() - state.checkedAt > POLL_MS / 2;
    if (stale) void refreshEngineStatus();
    if (timer === null) {
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void refreshEngineStatus();
      }, POLL_MS);
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return snapshot;
}
