import { describe, expect, it } from "vitest";

import { getCompatibleUpstreamModels } from "@/lib/canvas/compatible-upstream-models";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import type {
  CategoryMeta,
  ModelCatalogEntry,
} from "@/lib/canvas/types";

const categories: CategoryMeta[] = [
  { id: "page_loader", display_name: "Page loader", status: "done" },
  { id: "layout_detection", display_name: "Layout", status: "done" },
  { id: "ocr", display_name: "OCR", status: "done" },
];

const models: ModelCatalogEntry[] = [
  {
    id: "loader/pdf",
    category: "page_loader",
    provider: "docling",
    status: "done",
    compute: "cpu",
    license: "mit",
    python_extra: null,
    display_name: "PDF loader",
    notes: null,
  },
  {
    id: "docling/layout-heron",
    category: "layout_detection",
    provider: "docling",
    status: "done",
    compute: "gpu-mid",
    license: "mit",
    python_extra: null,
    display_name: "Layout Heron",
    notes: null,
  },
  {
    id: "loader/image",
    category: "page_loader",
    provider: "docling",
    status: "done",
    compute: "cpu",
    license: "mit",
    python_extra: null,
    display_name: "Image loader",
    notes: null,
  },
];

describe("getCompatibleUpstreamModels", () => {
  it("lists catalog models whose output wire satisfies the target input", () => {
    const targetData = buildPipelineNodeData(models[1], "Layout");

    const compatible = getCompatibleUpstreamModels(
      targetData,
      models,
      categories,
    );

    expect(compatible.map((entry) => entry.model.id).sort()).toEqual([
      "loader/image",
      "loader/pdf",
    ]);
  });

  it("excludes the target model itself", () => {
    const targetData = buildPipelineNodeData(models[1], "Layout");

    const compatible = getCompatibleUpstreamModels(
      targetData,
      models,
      categories,
    );

    expect(
      compatible.some((entry) => entry.model.id === "docling/layout-heron"),
    ).toBe(false);
  });
});
