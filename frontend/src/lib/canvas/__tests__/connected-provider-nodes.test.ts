import { describe, expect, it } from "vitest";

import { getDefaultParams } from "@/lib/canvas/category-meta";
import { buildInferencePayload, getModelInferenceDef } from "@/lib/canvas/node-inference-registry";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import { getModelWireKinds } from "@/lib/canvas/wire-types";
import type { PipelineNodeData } from "@/lib/canvas/types";

function nodeData(modelId: string, params: Record<string, string | boolean | number>) {
  return {
    modelId,
    label: modelId,
    category: "text_generation",
    categoryLabel: "Text & Prompt",
    provider: "openai-compatible",
    inputType: "Text",
    outputType: "Text",
    params,
    categoryColor: "var(--node-llm-extract)",
  } satisfies PipelineNodeData;
}

describe("branded connected provider nodes", () => {
  it("gives every protocol the same typed text and vision contracts", () => {
    for (const protocol of ["openai", "anthropic", "openai-compatible", "anthropic-compatible"]) {
      expect(getModelWireKinds(`${protocol}/text-prompt`, "", "")).toEqual({ input: "text", output: "text" });
      expect(getModelWireKinds(`${protocol}/vision-structured-extract`, "", "")).toEqual({ input: "page_artifact", output: "json" });
      expect(getModelInferenceDef(`${protocol}/text-prompt`)).not.toBeNull();
    }
  });

  it("sends the node protocol so a mismatched provider cannot run", () => {
    const modelId = "anthropic-compatible/text-prompt";
    const params = {
      ...getDefaultParams("text_generation", modelId),
      connection_id: "provider-id",
      model: "internal-claude",
      text: "Invoice #42",
    };
    const payload = buildInferencePayload(modelId, {
      projectId: "project-id",
      data: nodeData(modelId, params),
      upstreamPages: [],
      upstreamOutput: { kind: "text", raw: { text: "Invoice #42" } },
    });

    expect(payload).toMatchObject({
      text: "Invoice #42",
      options: { connection_id: "provider-id", provider_protocol: "anthropic-compatible" },
    });
    expect(validateNodeParams(modelId, params)).toEqual([]);
  });
});
