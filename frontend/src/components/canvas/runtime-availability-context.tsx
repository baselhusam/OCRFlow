"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchRuntimeAvailability } from "@/lib/api/models";
import {
  buildOfflineProviderSet,
  getModelRuntimeStatus,
  REMOTE_PROVIDERS,
  type ProviderRuntimeStatus,
} from "@/lib/canvas/provider-availability";
import type {
  ModelCatalogEntry,
  RuntimeAvailability,
} from "@/lib/canvas/types";

const RUNTIME_POLL_MS = 10_000;

type RuntimeAvailabilityValue = {
  runtime: RuntimeAvailability | null;
  offlineProviders: Set<string>;
  onlineRemoteProviders: string[];
  isProviderOffline: (provider: string) => boolean;
  getModelStatus: (
    model: Pick<ModelCatalogEntry, "id" | "provider">,
  ) => ProviderRuntimeStatus;
};

const EMPTY: RuntimeAvailabilityValue = {
  runtime: null,
  offlineProviders: new Set(),
  onlineRemoteProviders: [],
  isProviderOffline: () => false,
  getModelStatus: () => ({ offline: false }),
};

const RuntimeAvailabilityContext =
  createContext<RuntimeAvailabilityValue>(EMPTY);

type ProviderProps = {
  runtime: RuntimeAvailability | null;
  children: ReactNode;
};

function buildValue(
  runtime: RuntimeAvailability | null,
): RuntimeAvailabilityValue {
  const offlineProviders = buildOfflineProviderSet(runtime);
  const onlineRemoteProviders = [...REMOTE_PROVIDERS].filter(
    (provider) => !offlineProviders.has(provider),
  );
  // When we have a runtime payload, only list providers explicitly marked running.
  const confirmedOnline =
    runtime?.providers
      .filter((entry) => REMOTE_PROVIDERS.has(entry.provider) && entry.running)
      .map((entry) => entry.provider)
      .sort() ?? onlineRemoteProviders;

  return {
    runtime,
    offlineProviders,
    onlineRemoteProviders: confirmedOnline,
    isProviderOffline: (provider: string) => offlineProviders.has(provider),
    getModelStatus: (model) =>
      getModelRuntimeStatus(model, runtime),
  };
}

export function RuntimeAvailabilityProvider({
  runtime: initialRuntime,
  children,
}: ProviderProps) {
  const [runtime, setRuntime] = useState<RuntimeAvailability | null>(
    initialRuntime,
  );

  useEffect(() => {
    setRuntime(initialRuntime);
  }, [initialRuntime]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const next = await fetchRuntimeAvailability();
      if (!cancelled && next) {
        setRuntime(next);
      }
    };

    const id = window.setInterval(() => {
      void refresh();
    }, RUNTIME_POLL_MS);

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const value = useMemo(() => buildValue(runtime), [runtime]);

  return (
    <RuntimeAvailabilityContext.Provider value={value}>
      {children}
    </RuntimeAvailabilityContext.Provider>
  );
}

export function useRuntimeAvailability(): RuntimeAvailabilityValue {
  return useContext(RuntimeAvailabilityContext);
}
