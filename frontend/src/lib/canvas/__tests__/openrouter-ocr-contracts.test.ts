import { describe, expect, it } from "vitest";

import { formatOcrModelPrice, shortOcrModelName } from "@/lib/api/model-connections";
import { getDefaultParams } from "@/lib/canvas/category-meta";
import {
  getConnectedProtocol,
  isConnectedVisionModel,
  openRouterModelCaption,
} from "@/lib/canvas/connected-node-meta";
import { buildInferencePayload, getModelInferenceDef } from "@/lib/canvas/node-inference-registry";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import { getModelRuntimeStatus } from "@/lib/canvas/provider-availability";
import { getModelWireKinds } from "@/lib/canvas/wire-types";

const MODEL_ID = "openrouter/ocr";
const page = { page_index: 0, width: 1, height: 1, image_base64: "aW1hZ2U=" };

function nodeData(params: Record<string, string | boolean | number>) {
  return {
    modelId: MODEL_ID,
    label: "OpenRouter OCR",
    category: "vlm_convert",
    categoryLabel: "VLM Convert",
    provider: "openrouter",
    inputType: "PageArtifact",
    outputType: "DocumentArtifact + markdown",
    params,
    categoryColor: "var(--node-vlm-convert)",
  };
}

describe("OpenRouter OCR canvas contracts", () => {
  it("reads a page into a document like the other page parsers", () => {
    expect(getModelWireKinds(MODEL_ID, "PageArtifact", "vlm_convert")).toEqual({
      input: "page_artifact",
      output: "document_artifact",
    });
    expect(getConnectedProtocol(MODEL_ID)).toBe("openrouter");
    expect(isConnectedVisionModel(MODEL_ID)).toBe(true);
  });

  it("sends the chosen model, connection and protocol with the page", () => {
    const params = {
      ...getDefaultParams("vlm_convert", MODEL_ID),
      connection_id: "conn-1",
      model: "qwen/qwen2.5-vl-72b-instruct",
      model_label: "Qwen: Qwen2.5 VL 72B",
    };
    const payload = buildInferencePayload(MODEL_ID, {
      projectId: "project-1",
      data: nodeData(params),
      upstreamPages: [{ page_index: 0, page }],
      upstreamOutput: null,
    });

    expect(payload).toMatchObject({
      page,
      options: {
        connection_id: "conn-1",
        model: "qwen/qwen2.5-vl-72b-instruct",
        provider_protocol: "openrouter",
        max_tokens: 8192,
      },
    });
    expect(validateNodeParams(MODEL_ID, params)).toEqual([]);
  });

  it("will not run until a model is picked", () => {
    const params = { ...getDefaultParams("vlm_convert", MODEL_ID), connection_id: "conn-1" };
    expect(
      buildInferencePayload(MODEL_ID, {
        projectId: "project-1",
        data: nodeData(params),
        upstreamPages: [{ page_index: 0, page }],
        upstreamOutput: null,
      }),
    ).toBeNull();
    expect(validateNodeParams(MODEL_ID, params)).toContain("Model name is required");
  });

  it("returns markdown as a document output", () => {
    const output = getModelInferenceDef(MODEL_ID)?.extractOutput(MODEL_ID, {
      markdown: "# Invoice",
      document: { pages: [{}] },
    });
    expect(output?.kind).toBe("document");
    expect(output?.preview).toMatchObject({ pageCount: 1, markdownPreview: "# Invoice" });
  });

  it("is online only with a validated OpenRouter connection", () => {
    const model = { id: MODEL_ID, provider: "openrouter" };
    const offline = { mode: "remote", providers: [{ provider: "openrouter", running: false, mode: "configured", detail: null, models: [] }] };
    const online = { mode: "remote", providers: [{ provider: "openrouter", running: true, mode: "configured", detail: null, models: [] }] };
    expect(getModelRuntimeStatus(model, offline).offline).toBe(true);
    expect(getModelRuntimeStatus(model, online).offline).toBe(false);
  });

  it("captions nodes with the chosen model and formats catalog facts", () => {
    expect(openRouterModelCaption({ model: "x/y", model_label: "X: Y" })).toBe("X: Y");
    expect(openRouterModelCaption({})).toBe("Choose an OpenRouter model");
    expect(shortOcrModelName("Qwen: Qwen2.5 VL 72B")).toBe("Qwen2.5 VL 72B");
    expect(formatOcrModelPrice({ free: true, prompt_price: 0, completion_price: 0 })).toBe("Free");
    expect(formatOcrModelPrice({ free: false, prompt_price: 0.8, completion_price: 2 })).toBe("$0.80 in · $2.00 out / 1M");
  });
});
