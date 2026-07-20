"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  buildOfflineProviderSet,
  getModelRuntimeStatus,
  type ProviderRuntimeStatus,
} from "@/lib/canvas/provider-availability";
import type {
  ModelCatalogEntry,
  RuntimeAvailability,
} from "@/lib/canvas/types";

type RuntimeAvailabilityValue = {
  offlineProviders: Set<string>;
  isProviderOffline: (provider: string) => boolean;
  getModelStatus: (
    model: Pick<ModelCatalogEntry, "provider">,
  ) => ProviderRuntimeStatus;
};

const EMPTY: RuntimeAvailabilityValue = {
  offlineProviders: new Set(),
  isProviderOffline: () => false,
  getModelStatus: () => ({ offline: false }),
};

const RuntimeAvailabilityContext =
  createContext<RuntimeAvailabilityValue>(EMPTY);

type ProviderProps = {
  runtime: RuntimeAvailability | null;
  children: ReactNode;
};

export function RuntimeAvailabilityProvider({
  runtime,
  children,
}: ProviderProps) {
  const value = useMemo<RuntimeAvailabilityValue>(() => {
    const offlineProviders = buildOfflineProviderSet(runtime);
    return {
      offlineProviders,
      isProviderOffline: (provider: string) =>
        offlineProviders.has(provider),
      getModelStatus: (model) =>
        getModelRuntimeStatus(model, offlineProviders),
    };
  }, [runtime]);

  return (
    <RuntimeAvailabilityContext.Provider value={value}>
      {children}
    </RuntimeAvailabilityContext.Provider>
  );
}

export function useRuntimeAvailability(): RuntimeAvailabilityValue {
  return useContext(RuntimeAvailabilityContext);
}
