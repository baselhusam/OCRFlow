import { describe, expect, it } from "vitest";

import {
  adaptOutputForInput,
  regionToFigure,
  resolveUpstreamOutput,
} from "@/lib/canvas/artifact-adapters";
import { evaluatePipelineConnection } from "@/lib/canvas/connection-validation";
import { buildInferencePayload } from "@/lib/canvas/node-inference-registry";
import { buildItemHandle, sliceOutputByHandle } from "@/lib/canvas/output-slice";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";
import type { Node } from "@xyflow/react";

const sampleRegionsOutput: NodeCachedOutput = {
  kind: "regions",
  raw: {
    page_index: 0,
    regions: [
      {
        id: "r1",
        label: "text",
        bbox: [0, 0, 0.2, 0.2],
        confidence: 0.9,
      },
      {
        id: "r2",
        label: "figure",
        docling_label: "PICTURE",
        bbox: [0.2, 0.2, 0.5, 0.5],
        confidence: 0.95,
      },
    ],
  },
  preview: {
    itemCount: 2,
    pageImage: {
      page_index: 0,
      width: 100,
      height: 100,
      image_base64: "abc",
    },
  },
};

function makeNode(
  id: string,
  modelId: string,
  category: string,
  cachedOutput?: NodeCachedOutput | null,
): Node<PipelineNodeData> {
  return {
    id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      modelId,
      label: id,
      category,
      categoryLabel: category,
      provider: "docling",
      inputType: "Figure[]",
      outputType: "Figure[]",
      params: {},
      categoryColor: "#000",
      cachedOutput: cachedOutput ?? null,
    },
  };
}

describe("sliceOutputByHandle", () => {
  it("keeps page image when slicing a single region", () => {
    const handle = buildItemHandle("region", "r2");
    const sliced = sliceOutputByHandle(sampleRegionsOutput, handle);
    expect(sliced?.kind).toBe("regions");
    expect((sliced?.raw as { regions: unknown[] }).regions).toHaveLength(1);
    expect(sliced?.preview?.pageImage?.image_base64).toBe("abc");
  });
});

describe("adaptOutputForInput", () => {
  it("converts a single picture region to figures", () => {
    const handle = buildItemHandle("region", "r2");
    const sliced = sliceOutputByHandle(sampleRegionsOutput, handle)!;
    const adapted = adaptOutputForInput(sliced, "figure_array");
    expect(adapted?.kind).toBe("figures");
    const figures = (adapted?.raw as { figures: ReturnType<typeof regionToFigure>[] })
      .figures;
    expect(figures).toHaveLength(1);
    expect(figures[0].id).toBe("r2");
  });
});

describe("resolveUpstreamOutput", () => {
  it("slices and adapts for picture description input", () => {
    const handle = buildItemHandle("region", "r2");
    const resolved = resolveUpstreamOutput(
      sampleRegionsOutput,
      handle,
      "figure_array",
    );
    expect(resolved?.kind).toBe("figures");
  });
});

describe("evaluatePipelineConnection", () => {
  it("allows figure region to picture description", () => {
    const source = makeNode(
      "layout-1",
      "docling/layout-heron",
      "layout_detection",
      sampleRegionsOutput,
    );
    source.data.outputType = "PageArtifact + regions";
    const target = makeNode(
      "desc-1",
      "docling/picture-description-smolvlm",
      "figure_captioning",
    );
    target.data.inputType = "Figure[]";

    const ok = evaluatePipelineConnection(
      source,
      target,
      buildItemHandle("region", "r2"),
    );
    expect(ok).toBe(true);
  });

  it("rejects text region to picture description", () => {
    const source = makeNode(
      "layout-1",
      "docling/layout-heron",
      "layout_detection",
      sampleRegionsOutput,
    );
    source.data.outputType = "PageArtifact + regions";
    const target = makeNode(
      "desc-1",
      "docling/picture-description-smolvlm",
      "figure_captioning",
    );
    target.data.inputType = "Figure[]";

    const ok = evaluatePipelineConnection(
      source,
      target,
      buildItemHandle("region", "r1"),
      [source, target],
    );
    expect(ok).toBe(false);
  });

  it("allows figure region from region branch to picture description", () => {
    const layout = makeNode(
      "layout-1",
      "docling/layout-heron",
      "layout_detection",
      sampleRegionsOutput,
    );
    layout.data.outputType = "PageArtifact + regions";
    const branch = makeNode(
      "branch-1",
      "layout/region-branch",
      "layout_detection",
    );
    branch.data.inputType = "PageArtifact + regions";
    branch.data.outputType = "PageArtifact + regions";
    branch.data.params = { parentLayoutNodeId: "layout-1" };
    const target = makeNode(
      "desc-1",
      "docling/picture-description-smolvlm",
      "figure_captioning",
    );
    target.data.inputType = "Figure[]";

    const ok = evaluatePipelineConnection(
      branch,
      target,
      buildItemHandle("region", "r2"),
      [layout, branch, target],
    );
    expect(ok).toBe(true);
  });
});

describe("picture-description payload", () => {
  it("includes page and figures", () => {
    const handle = buildItemHandle("region", "r2");
    const upstreamOutput = resolveUpstreamOutput(
      sampleRegionsOutput,
      handle,
      "figure_array",
    );

    const payload = buildInferencePayload("docling/picture-description-smolvlm", {
      projectId: "p1",
      data: {
        modelId: "docling/picture-description-smolvlm",
        label: "Picture Description",
        category: "figure_captioning",
        categoryLabel: "Figure captioning",
        provider: "docling",
        inputType: "Figure[]",
        outputType: "Figure[]",
        params: { max_tokens: 128 },
        categoryColor: "#000",
      },
      upstreamPages: [],
      upstreamOutput,
    });

    expect(payload).not.toBeNull();
    expect(payload?.page).toBeDefined();
    expect((payload?.figures as unknown[]).length).toBe(1);
  });
});

describe("latex-ocr payload", () => {
  it("maps layout formula regions to formulas, not a raw regions field", () => {
    const payload = buildInferencePayload("surya/latex-ocr", {
      projectId: "p1",
      data: {
        modelId: "surya/latex-ocr",
        label: "Latex Ocr",
        category: "formula_recognition",
        categoryLabel: "Formula recognition",
        provider: "surya",
        inputType: "PageArtifact",
        outputType: "Formula[]",
        params: {},
        categoryColor: "#000",
      },
      upstreamPages: [],
      upstreamOutput: {
        kind: "regions",
        raw: {
          regions: [
            {
              id: "r1",
              label: "paragraph",
              bbox: [0, 0, 0.4, 0.2],
              confidence: 0.9,
            },
            {
              id: "f1",
              label: "formula",
              bbox: [0.1, 0.4, 0.6, 0.55],
              confidence: 0.8,
            },
          ],
        },
        preview: {
          pageImage: {
            page_index: 0,
            width: 100,
            height: 100,
            image_base64: "abc",
          },
        },
      },
    });

    expect(payload).toEqual({
      page: {
        page_index: 0,
        width: 100,
        height: 100,
        image_base64: "abc",
      },
      formulas: [{ id: "f1", bbox: [0.1, 0.4, 0.6, 0.55] }],
    });
  });

  it("ignores persisted page stubs that no longer have image bytes", () => {
    const payload = buildInferencePayload("surya/reading-order", {
      projectId: "p1",
      data: {
        modelId: "surya/reading-order",
        label: "Reading Order",
        category: "reading_order",
        categoryLabel: "Reading Order",
        provider: "surya",
        inputType: "PageArtifact",
        outputType: "ReadingOrder",
        params: {},
        categoryColor: "#000",
      },
      upstreamPages: [
        {
          page_index: 0,
          page: {
            page_index: 0,
            width: 1200,
            height: 1600,
            image_base64: "real-page",
          },
        },
      ],
      upstreamOutput: {
        kind: "regions",
        raw: {
          regions: [
            {
              id: "r1",
              label: "other",
              bbox: [0.25, 0.25, 0.75, 0.75],
              confidence: 0.99,
            },
          ],
        },
        preview: {
          pageImage: {
            page_index: 0,
            width: 1200,
            height: 1600,
          },
        },
      },
    });

    expect(payload?.page).toEqual({
      page_index: 0,
      width: 1200,
      height: 1600,
      image_base64: "real-page",
    });
  });
});
