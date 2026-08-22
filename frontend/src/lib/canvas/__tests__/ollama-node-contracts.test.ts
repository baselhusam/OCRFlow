import { describe, expect, it } from "vitest";

import { getDefaultParams } from "@/lib/canvas/category-meta";
import {
  buildInferencePayload,
  getModelInferenceDef,
} from "@/lib/canvas/node-inference-registry";
import { getParamSchema } from "@/lib/canvas/node-param-schema";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { getModelWireKinds } from "@/lib/canvas/wire-types";

function nodeData(
  modelId: string,
  category: string,
  params: PipelineNodeData["params"],
): PipelineNodeData {
  return {
    modelId,
    label: modelId,
    category,
    categoryLabel: category,
    provider: "ollama",
    inputType: "Text",
    outputType: "JSON",
    params,
    categoryColor: "#000",
  };
}

describe("local Ollama node contracts", () => {
  it("exposes sub-1B model and prompt configuration", () => {
    const fields = getParamSchema(
      "ollama/structured-extract",
      "llm_extract",
    );
    expect(fields.find((field) => field.key === "model")?.options).toEqual([
      { value: "qwen3:0.6b", label: "Qwen 3 · 0.6B (text)" },
      { value: "qwen3.5:0.8b", label: "Qwen 3.5 · 0.8B (multimodal)" },
    ]);
    expect(fields.find((field) => field.key === "prompt")?.type).toBe(
      "textarea",
    );
    expect(fields.find((field) => field.key === "json_schema")?.type).toBe(
      "textarea",
    );
  });

  it("builds schema-constrained extraction payloads from OCR lines", () => {
    const params = getDefaultParams(
      "llm_extract",
      "ollama/structured-extract",
    );
    const payload = buildInferencePayload("ollama/structured-extract", {
      projectId: "project-1",
      data: nodeData("ollama/structured-extract", "llm_extract", params),
      upstreamPages: [],
      upstreamOutput: {
        kind: "lines",
        raw: {
          lines: [
            { text: "Invoice INV-42" },
            { text: "Total 42.00 USD" },
          ],
        },
      },
    });

    expect(payload?.text).toBe("Invoice INV-42\nTotal 42.00 USD");
    expect(payload?.options).toMatchObject({
      model: "qwen3:0.6b",
      temperature: 0,
    });
    expect(payload?.json_schema).toMatchObject({ type: "object" });
  });

  it("keeps text and vision wires distinct", () => {
    expect(
      getModelWireKinds("ollama/text-prompt", "Text", "Text"),
    ).toEqual({ input: "text", output: "text" });
    expect(
      getModelWireKinds(
        "ollama/vision-structured-extract",
        "PageArtifact",
        "JSON",
      ),
    ).toEqual({ input: "page_artifact", output: "json" });
    expect(getModelInferenceDef("ollama/vision-prompt")).not.toBeNull();
    expect(
      isPlannedNode("ollama/structured-extract", "llm_extract"),
    ).toBe(false);
  });

  it("rejects malformed schemas and over-budget model choices", () => {
    const issues = validateNodeParams("ollama/structured-extract", {
      model: "qwen3.5:9b",
      prompt: "Extract fields",
      json_schema: "{bad json",
    });
    expect(issues).toContain(
      "Select a supported local model under 1B parameters",
    );
    expect(issues).toContain("JSON Schema must be valid JSON");
  });
});
