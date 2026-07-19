import { describe, expect, it } from "vitest";

import { getCompatibleDownstreamModels } from "@/lib/canvas/compatible-downstream-models";
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

describe("getCompatibleDownstreamModels", () => {
  it("lists catalog models that accept the source output wire", () => {
    const sourceData = buildPipelineNodeData(models[0], "Page loader");

    const compatible = getCompatibleDownstreamModels(
      sourceData,
      models,
      categories,
    );

    expect(compatible.map((entry) => entry.model.id)).toEqual([
      "docling/layout-heron",
    ]);
  });

  it("excludes the source model itself", () => {
    const sourceData = buildPipelineNodeData(models[0], "Page loader");

    const compatible = getCompatibleDownstreamModels(
      sourceData,
      models,
      categories,
    );

    expect(compatible.some((entry) => entry.model.id === "loader/pdf")).toBe(
      false,
    );
  });
});
