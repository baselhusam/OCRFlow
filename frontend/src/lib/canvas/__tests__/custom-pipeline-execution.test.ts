import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Pipeline } from "@/lib/api/client";
import { runModelInference } from "@/lib/api/inference";
import { buildCustomPipelineNodeData } from "@/lib/canvas/custom-pipeline-node-data";
import { runCustomPipelineSubgraph } from "@/lib/canvas/custom-pipeline-execution";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type {
  CategoryMeta,
  ModelCatalogEntry,
  NodeCachedOutput,
  PipelineGraph,
} from "@/lib/canvas/types";
import { customPipelineModelId } from "@/lib/canvas/wire-types";

vi.mock("@/lib/api/inference", () => ({
  runModelInference: vi.fn(),
}));

const models: ModelCatalogEntry[] = [
  makeModel("docling/layout-heron", "layout_detection", "Docling Layout Heron"),
  makeModel("surya/text-detection", "text_detection", "Text Detection"),
  makeModel("surya/text-recognition", "text_recognition", "Text Recognition"),
];

const categories: CategoryMeta[] = [
  { id: "layout_detection", display_name: "Layout Detection", status: "done" },
  { id: "text_detection", display_name: "Text Detection", status: "done" },
  { id: "text_recognition", display_name: "Text Recognition", status: "done" },
];

const graph: PipelineGraph = {
  // Saved node order can differ from execution order after drag/drop edits.
  nodes: [
    {
      id: "detect",
      modelId: "surya/text-detection",
      position: { x: 200, y: 0 },
    },
    {
      id: "recognize",
      modelId: "surya/text-recognition",
      position: { x: 400, y: 0 },
    },
    {
      id: "layout",
      modelId: "docling/layout-heron",
      position: { x: 0, y: 0 },
    },
  ],
  edges: [
    { id: "e-layout-detect", source: "layout", target: "detect" },
    { id: "e-detect-recognize", source: "detect", target: "recognize" },
  ],
};

const page = {
  page_index: 0,
  width: 100,
  height: 200,
  image_base64: "image-data",
};

function makeModel(
  id: string,
  category: string,
  displayName: string,
): ModelCatalogEntry {
  return {
    id,
    category,
    provider: id.split("/")[0] ?? "test",
    status: "done",
    compute: "cpu",
    license: "mit",
    python_extra: null,
    display_name: displayName,
    notes: null,
  };
}

function makePipeline(): Pipeline {
  return {
    id: "pipeline-1",
    name: "Image Description with Structured Output",
    description: null,
    graph: graph as unknown as Record<string, unknown>,
    input_wire_kind: "page_artifact",
    output_wire_kind: "text_line_array",
    input_type_label: "PageArtifact",
    output_type_label: "TextLine[] (with text)",
    accent_color: "#5B2EEF",
    is_archived: false,
    has_logo: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("custom pipeline nodes", () => {
  beforeEach(() => {
    vi.mocked(runModelInference).mockReset();
  });

  it("lists internal models in graph execution order", () => {
    const data = buildCustomPipelineNodeData(makePipeline());

    expect(data.internalModelIds).toEqual([
      "docling/layout-heron",
      "surya/text-detection",
      "surya/text-recognition",
    ]);
  });

  it("does not mark custom pipeline nodes as pending implementation", () => {
    expect(
      isPlannedNode(customPipelineModelId("pipeline-1"), "custom_pipeline"),
    ).toBe(false);
  });

  it("runs the entry node with project input and preserves page image for downstream steps", async () => {
    const upstreamOutput: NodeCachedOutput = {
      kind: "page",
      raw: { page },
      preview: { pageImage: page, thumbnailBase64: page.image_base64 },
    };

    vi.mocked(runModelInference).mockImplementation(async (modelId, payload) => {
      if (modelId === "docling/layout-heron") {
        expect(payload).toMatchObject({ page });
        return {
          page_index: 0,
          regions: [{ id: "r1", bbox: [0, 0, 1, 1], label: "text" }],
        };
      }

      if (modelId === "surya/text-detection") {
        expect(payload).toMatchObject({
          page,
          regions: [{ id: "r1", bbox: [0, 0, 1, 1], label: "text" }],
        });
        return {
          page_index: 0,
          lines: [{ id: "l1", bbox: [0, 0, 1, 0.1] }],
        };
      }

      if (modelId === "surya/text-recognition") {
        expect(payload).toMatchObject({
          page,
          lines: [{ id: "l1", bbox: [0, 0, 1, 0.1] }],
        });
        return {
          page_index: 0,
          lines: [{ id: "l1", bbox: [0, 0, 1, 0.1], text: "Invoice" }],
        };
      }

      throw new Error(`Unexpected model ${modelId}`);
    });

    const output = await runCustomPipelineSubgraph({
      projectId: "project-1",
      nodeId: "custom-node",
      pipelineGraph: graph,
      upstreamOutput,
      models,
      categories,
    });

    expect(vi.mocked(runModelInference).mock.calls.map(([modelId]) => modelId)).toEqual([
      "docling/layout-heron",
      "surya/text-detection",
      "surya/text-recognition",
    ]);
    expect(output.kind).toBe("lines");
    expect(output.preview?.pageImage).toEqual(page);
    expect(output.preview?.textSnippets).toEqual(["Invoice"]);
  });
});
