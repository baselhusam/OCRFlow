import { describe, expect, it } from "vitest";

import { getDefaultParams } from "@/lib/canvas/category-meta";
import {
  CONVERT_PIPELINE_PARAM_DEFAULTS,
  getParamDefaultValue,
  getParamSchema,
} from "@/lib/canvas/node-param-schema";
import { validateNodeParams } from "@/lib/canvas/node-readiness";

describe("docling/convert-pipeline params", () => {
  it("exposes select fields with Docling option lists", () => {
    const schema = getParamSchema("docling/convert-pipeline", "assembler");
    const layout = schema.find((field) => field.key === "layout_model");
    const ocr = schema.find((field) => field.key === "ocr_engine");
    const table = schema.find((field) => field.key === "tableformer_mode");

    expect(layout?.type).toBe("select");
    expect(layout?.options?.map((opt) => opt.value)).toEqual([
      "heron",
      "heron-101",
      "egret-medium",
      "egret-large",
      "egret-xlarge",
    ]);
    expect(ocr?.type).toBe("select");
    expect(ocr?.options?.map((opt) => opt.value)).toContain("auto");
    expect(table?.type).toBe("select");
    expect(table?.options?.map((opt) => opt.value)).toEqual(["accurate", "fast"]);
  });

  it("uses model defaults for new nodes", () => {
    expect(getDefaultParams("assembler", "docling/convert-pipeline")).toEqual(
      CONVERT_PIPELINE_PARAM_DEFAULTS,
    );
    expect(getParamDefaultValue("docling/convert-pipeline", "layout_model")).toBe(
      "heron",
    );
    expect(getParamDefaultValue("docling/convert-pipeline", "ocr_engine")).toBe(
      "auto",
    );
  });

  it("rejects unsupported select values", () => {
    const issues = validateNodeParams("docling/convert-pipeline", {
      layout_model: "unknown",
      ocr_engine: "auto",
      tableformer_mode: "accurate",
    });
    expect(issues).toContain("layout_model must be a supported layout model");
  });
});
