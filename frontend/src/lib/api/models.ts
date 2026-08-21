import { apiFetch, getApiUrl } from "@/lib/api/client";
import type {
  CategoryMeta,
  ModelCatalogEntry,
  RuntimeAvailability,
} from "@/lib/canvas/types";

export async function fetchModelCatalog(): Promise<ModelCatalogEntry[]> {
  const { data } = await apiFetch<ModelCatalogEntry[]>("/api/v1/models/");
  return data;
}

export async function fetchModelCategories(): Promise<CategoryMeta[]> {
  const { data } = await apiFetch<CategoryMeta[]>("/api/v1/models/categories");
  return data;
}

/**
 * Which provider backends are reachable right now. Drives canvas gating.
 *
 * Browser calls the same-origin BFF (`/api/models/runtime`). Server components
 * call the backend directly. Failures return `null`; the palette treats remote
 * providers as unavailable until a successful probe arrives.
 */
export async function fetchRuntimeAvailability(): Promise<RuntimeAvailability | null> {
  try {
    if (typeof window === "undefined") {
      const { data } = await apiFetch<RuntimeAvailability>(
        "/api/v1/models/runtime",
      );
      return data;
    }

    const response = await fetch("/api/models/runtime", {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return null;
    return (await response.json()) as RuntimeAvailability;
  } catch {
    return null;
  }
}

/** Absolute backend URL helper for server-only callers that need it. */
export function backendModelsRuntimeUrl(): string {
  return `${getApiUrl()}/api/v1/models/runtime`;
}
