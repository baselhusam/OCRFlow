import { apiFetch } from "@/lib/api/client";
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
 * Failures degrade open: if the runtime endpoint is unavailable we treat every
 * provider as available rather than blocking the whole palette.
 */
export async function fetchRuntimeAvailability(): Promise<RuntimeAvailability | null> {
  try {
    const { data } = await apiFetch<RuntimeAvailability>(
      "/api/v1/models/runtime",
    );
    return data;
  } catch {
    return null;
  }
}
