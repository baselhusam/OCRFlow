import { apiFetch } from "@/lib/api/client";
import type { CategoryMeta, ModelCatalogEntry } from "@/lib/canvas/types";

export async function fetchModelCatalog(): Promise<ModelCatalogEntry[]> {
  const { data } = await apiFetch<ModelCatalogEntry[]>("/api/v1/models/");
  return data;
}

export async function fetchModelCategories(): Promise<CategoryMeta[]> {
  const { data } = await apiFetch<CategoryMeta[]>("/api/v1/models/categories");
  return data;
}
