import type {
  ModelCatalogEntry,
  RuntimeAvailability,
} from "@/lib/canvas/types";

/**
 * Providers that run as their own containerized service in remote mode. Mirrors
 * REMOTE_PROVIDERS in the backend (app/models/servable.py). Only these can be
 * "offline"; native platform providers (loaders, export, transforms) always run
 * in whichever process handles the request.
 */
export const REMOTE_PROVIDERS = new Set(["docling", "surya", "paddle"]);

/** Stable display order for OCR microservice status chips. */
export const REMOTE_PROVIDER_ORDER = ["surya", "docling", "paddle"] as const;

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  docling: "Docling",
  surya: "Surya",
  paddle: "PaddleOCR",
};

export type ProviderRuntimeStatus = {
  /** True when the model's provider is a remote provider that is not running. */
  offline: boolean;
  /** Human-readable hint shown in the palette / node detail when offline. */
  message?: string;
};

const AVAILABLE: ProviderRuntimeStatus = { offline: false };

export function providerDisplayName(provider: string): string {
  return PROVIDER_DISPLAY_NAMES[provider] ?? provider;
}

export function providerOfflineMessage(provider: string): string {
  return `Start the ${providerDisplayName(provider)} service to use this model.`;
}

/**
 * Build the set of remote providers that are currently offline.
 *
 * Degrades closed: a missing/failed runtime signal (`null`) treats every remote
 * provider as offline so the palette never pretends OCR services are up.
 */
export function buildOfflineProviderSet(
  runtime: RuntimeAvailability | null | undefined,
): Set<string> {
  if (!runtime) {
    return new Set(REMOTE_PROVIDERS);
  }
  const offline = new Set<string>();
  for (const entry of runtime.providers) {
    if (REMOTE_PROVIDERS.has(entry.provider) && !entry.running) {
      offline.add(entry.provider);
    }
  }
  return offline;
}

export function isProviderOffline(
  provider: string,
  offlineProviders: Set<string>,
): boolean {
  return offlineProviders.has(provider);
}

/** Runtime status for a specific model given the offline-provider set. */
export function getModelRuntimeStatus(
  model: Pick<ModelCatalogEntry, "provider">,
  offlineProviders: Set<string>,
): ProviderRuntimeStatus {
  if (isProviderOffline(model.provider, offlineProviders)) {
    return {
      offline: true,
      message: providerOfflineMessage(model.provider),
    };
  }
  return AVAILABLE;
}
