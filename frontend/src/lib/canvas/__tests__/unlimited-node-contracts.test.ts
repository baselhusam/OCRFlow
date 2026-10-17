import { describe, expect, it } from "vitest";

import { getDefaultParams } from "@/lib/canvas/category-meta";
import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import {
  buildInferencePayload,
  getModelInferenceDef,
} from "@/lib/canvas/node-inference-registry";
import { validateNodeParams } from "@/lib/canvas/node-readiness";
import { getModelWireKinds } from "@/lib/canvas/wire-types";

const page = {
  page_index: 0,
  width: 1,
  height: 1,
  image_base64: "aW1hZ2U=",
};

function nodeData(modelId: string) {
  return {
    modelId,
    label: modelId,
    category: "vlm_convert",
    categoryLabel: "Document conversion",
    provider: "unlimited",
    inputType: "PageArtifact",
    outputType: "DocumentArtifact + markdown",
    params: getDefaultParams("vlm_convert", modelId),
    categoryColor: "var(--node-vlm-convert)",
  };
}

describe("Unlimited-OCR canvas contracts", () => {
  it("parses one page into a document, or a whole file as a converter", () => {
    expect(
      getModelWireKinds("unlimited/document-parse", "PageArtifact", "vlm_convert"),
    ).toEqual({ input: "page_artifact", output: "document_artifact" });
    expect(
      getModelWireKinds("unlimited/multi-page-parse", "DocumentInput", "vlm_convert"),
    ).toEqual({ input: "document_input", output: "document_artifact" });
    // Per-page parsing stays mappable ("Apply to all pages"); multi-page owns the file.
    expect(isDocumentConverterNode("unlimited/document-parse")).toBe(false);
    expect(isDocumentConverterNode("unlimited/multi-page-parse")).toBe(true);
  });

  it("sends the page with page-view options", () => {
    const payload = buildInferencePayload("unlimited/document-parse", {
      projectId: "project-1",
      data: nodeData("unlimited/document-parse"),
      upstreamPages: [{ page_index: 0, page }],
      upstreamOutput: null,
    });

    expect(payload).toEqual({
      page,
      options: { mode: "detail", max_tokens: 8192, include_furniture: false },
    });
  });

  it("sends the uploaded document with chunking options", () => {
    const data = nodeData("unlimited/multi-page-parse");
    data.params = { ...data.params, assetId: "asset-1", format: "pdf" };
    const payload = buildInferencePayload("unlimited/multi-page-parse", {
      projectId: "project-1",
      data,
      upstreamPages: [],
      upstreamOutput: null,
    });

    expect(payload).toMatchObject({
      document: { source: "asset:asset-1", format: "pdf" },
      options: {
        project_id: "project-1",
        dpi: 200,
        pages_per_pass: 8,
        max_pages: 64,
        include_furniture: false,
      },
    });
  });

  it("exposes markdown and page count as a document output", () => {
    const def = getModelInferenceDef("unlimited/multi-page-parse");
    const output = def?.extractOutput("unlimited/multi-page-parse", {
      markdown: "## Title",
      document: { pages: [{}, {}] },
    });

    expect(output?.kind).toBe("document");
    expect(output?.preview).toMatchObject({ pageCount: 2, markdownPreview: "## Title" });
  });

  it("validates page view and chunk sizes", () => {
    expect(validateNodeParams("unlimited/document-parse", { mode: "gundam" })).toContain(
      "Page view must be detail or fast",
    );
    expect(
      validateNodeParams("unlimited/multi-page-parse", { pages_per_pass: 20 }),
    ).toContain("Pages per pass must be between 1 and 16");
    expect(
      validateNodeParams(
        "unlimited/multi-page-parse",
        getDefaultParams("vlm_convert", "unlimited/multi-page-parse"),
      ),
    ).toEqual([]);
  });
});
