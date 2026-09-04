import type {
  ModelCatalogEntry,
  RuntimeAvailability,
} from "@/lib/canvas/types";
import { CONNECTED_PROTOCOLS, getConnectedProtocol } from "@/lib/canvas/connected-node-meta";

/**
 * Providers that run as their own containerized service in remote mode. Mirrors
 * REMOTE_PROVIDERS in the backend (app/models/servable.py). Only these can be
 * "offline"; native platform providers (loaders, export, transforms) always run
 * in whichever process handles the request.
 */
export const REMOTE_PROVIDERS = new Set([
  "docling",
  "surya",
  "paddle",
  "ollama",
  "liquid",
]);

/** Stable display order for OCR microservice status chips. */
export const REMOTE_PROVIDER_ORDER = [
  "surya",
  "docling",
  "paddle",
  "ollama",
  "liquid",
] as const;

/** Configurable API services shown alongside OCR service health in the palette. */
export const LANGUAGE_PROVIDER_ORDER = CONNECTED_PROTOCOLS;

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  docling: "Docling",
  surya: "Surya",
  paddle: "PaddleOCR",
  ollama: "Ollama",
  liquid: "Liquid AI",
  openai: "OpenAI",
  anthropic: "Anthropic",
  "openai-compatible": "OpenAI-compatible",
  "anthropic-compatible": "Anthropic-compatible",
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
  model: Pick<ModelCatalogEntry, "id" | "provider">,
  runtime: RuntimeAvailability | null | undefined,
): ProviderRuntimeStatus {
  const configuredProtocol = getConnectedProtocol(model.id);
  if (!runtime) {
    return {
      offline: true,
      message: configuredProtocol
        ? `Connect and validate an ${providerDisplayName(configuredProtocol)} provider in Configuration to use this node.`
        : providerOfflineMessage(model.provider),
    };
  }
  const provider = runtime.providers.find(
    (entry) => entry.provider === (configuredProtocol ?? model.provider),
  );
  if (configuredProtocol) {
    if (!provider || !provider.running) {
      return {
        offline: true,
        message: `Connect and validate an ${providerDisplayName(configuredProtocol)} provider in Configuration to use this node.`,
      };
    }
    return AVAILABLE;
  }
  if (!provider || !provider.running) {
    return { offline: true, message: providerOfflineMessage(model.provider) };
  }
  if (REMOTE_PROVIDERS.has(model.provider) && provider.models?.length && !provider.models.includes(model.id)) {
    return {
      offline: true,
      message: `${model.id} is not available on the connected ${providerDisplayName(model.provider)} engine.`,
    };
  }
  return AVAILABLE;
}
