import {
  getCategoryDescription,
  getDefaultParams,
  getCategoryColor,
} from "@/lib/canvas/category-meta";
import { getCanonicalModelWireLabels } from "@/lib/canvas/wire-types";
import type {
  CategoryMeta,
  CategoryWireTypes,
  ModelCatalogEntry,
  PipelineNodeData,
} from "@/lib/canvas/types";

export function getModelWireTypes(entry: ModelCatalogEntry): CategoryWireTypes {
  return getCanonicalModelWireLabels(entry.id, entry.category);
}

export function getModelLabel(entry: ModelCatalogEntry): string {
  if (entry.display_name) return entry.display_name;
  const slug = entry.id.split("/").pop() ?? entry.id;
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getModelDescription(entry: ModelCatalogEntry): string {
  return entry.notes ?? getCategoryDescription(entry.category);
}

export function filterDoneModels(
  models: ModelCatalogEntry[],
): ModelCatalogEntry[] {
  return models.filter((m) => m.status === "done");
}

export type ModelCategoryGroup = {
  categoryId: string;
  categoryLabel: string;
  models: ModelCatalogEntry[];
};

export function groupModelsByCategory(
  models: ModelCatalogEntry[],
  categories: CategoryMeta[],
): ModelCategoryGroup[] {
  const categoryLabels = new Map(
    categories.map((c) => [c.id, c.display_name]),
  );
  const byCategory = new Map<string, ModelCatalogEntry[]>();

  for (const model of models) {
    const list = byCategory.get(model.category) ?? [];
    list.push(model);
    byCategory.set(model.category, list);
  }

  return [...byCategory.entries()]
    .map(([categoryId, categoryModels]) => ({
      categoryId,
      categoryLabel: categoryLabels.get(categoryId) ?? categoryId,
      models: [...categoryModels].sort((a, b) =>
        getModelLabel(a).localeCompare(getModelLabel(b)),
      ),
    }))
    .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));
}

export function sortPaletteModels(
  models: ModelCatalogEntry[],
  categories: CategoryMeta[],
): Array<{ model: ModelCatalogEntry; categoryLabel: string }> {
  return groupModelsByCategory(models, categories).flatMap((group) =>
    group.models.map((model) => ({
      model,
      categoryLabel: group.categoryLabel,
    })),
  );
}

export function filterModels(
  models: ModelCatalogEntry[],
  categories: CategoryMeta[],
  query: string,
): ModelCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;

  const categoryLabels = new Map(
    categories.map((c) => [c.id, c.display_name.toLowerCase()]),
  );

  return models.filter((model) => {
    const label = getModelLabel(model).toLowerCase();
    const categoryLabel =
      categoryLabels.get(model.category) ?? model.category;
    return (
      label.includes(q) ||
      model.id.toLowerCase().includes(q) ||
      model.provider.toLowerCase().includes(q) ||
      categoryLabel.includes(q) ||
      model.category.toLowerCase().includes(q)
    );
  });
}

export function buildPipelineNodeData(
  entry: ModelCatalogEntry,
  categoryLabel: string,
  config?: Record<string, string | boolean | number>,
): PipelineNodeData {
  const wire = getModelWireTypes(entry);
  return {
    modelId: entry.id,
    label: getModelLabel(entry),
    category: entry.category,
    categoryLabel,
    provider: entry.provider,
    inputType: wire.input,
    outputType: wire.output,
    params: config ?? getDefaultParams(entry.category, entry.id),
    categoryColor: getCategoryColor(entry.category),
    compute: entry.compute,
  };
}

export function formatComputeTier(compute: string): string {
  switch (compute) {
    case "cpu":
      return "CPU";
    case "gpu-low":
      return "GPU · low";
    case "gpu-mid":
      return "GPU · mid";
    case "api":
      return "API";
    default:
      return compute;
  }
}
