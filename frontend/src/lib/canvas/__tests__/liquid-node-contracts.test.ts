import { describe, expect, it } from "vitest";

import { getDefaultParams } from "@/lib/canvas/category-meta";
import { buildInferencePayload, getModelInferenceDef } from "@/lib/canvas/node-inference-registry";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import { getModelWireKinds } from "@/lib/canvas/wire-types";

const page = {
  page_index: 0,
  width: 1,
  height: 1,
  image_base64: "aW1hZ2U=",
};

describe("Liquid LFM2.5-VL-1.6B canvas contracts", () => {
  it("uses the Liquid 1.6B checkpoint by default", () => {
    expect(getDefaultParams("vision_language", "liquid/vision-prompt")).toMatchObject({
      model: "LiquidAI/LFM2.5-VL-1.6B",
      temperature: 0.1,
    });
  });

  it("builds a structured vision request with the fixed Liquid checkpoint", () => {
    const params = getDefaultParams(
      "vision_language",
      "liquid/vision-structured-extract",
    );
    const payload = buildInferencePayload("liquid/vision-structured-extract", {
      projectId: "project-1",
      data: {
        modelId: "liquid/vision-structured-extract",
        label: "Liquid Vision Structured Extract",
        category: "vision_language",
        categoryLabel: "Vision Language",
        provider: "liquid",
        inputType: "PageArtifact",
        outputType: "JSON",
        params,
        categoryColor: "var(--node-vlm-convert)",
      },
      upstreamPages: [{ page_index: 0, page }],
      upstreamOutput: null,
    });

    expect(payload).toMatchObject({
      page,
      options: { model: "LiquidAI/LFM2.5-VL-1.6B", temperature: 0.1 },
      json_schema: { type: "object" },
    });
  });

  it("exposes text and JSON wire contracts and validates node options", () => {
    expect(getModelWireKinds("liquid/vision-prompt", "Vision Language", "vision_language")).toEqual({
      input: "page_artifact",
      output: "text",
    });
    expect(getModelWireKinds("liquid/vision-structured-extract", "Vision Language", "vision_language")).toEqual({
      input: "page_artifact",
      output: "json",
    });
    expect(getModelInferenceDef("liquid/vision-prompt")).not.toBeNull();
    expect(validateNodeParams("liquid/vision-prompt", { model: "wrong", prompt: "Read" })).toContain(
      "Liquid nodes use the bundled LFM2.5-VL-1.6B model",
    );
  });
});
