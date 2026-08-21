import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import { collectUpstreamChain } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";

function makeNode(
  id: string,
  modelId: string,
  partial: Partial<PipelineNodeData> = {},
): Node<PipelineNodeData> {
  return {
    id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      label: id,
      modelId,
      category: "loader",
      categoryLabel: "Loader",
      provider: "test",
      inputType: "file",
      outputType: "pages",
      params: {},
      categoryColor: "#000000",
      ...partial,
    },
  };
}

describe("collectUpstreamChain", () => {
  it("returns upstream nodes in run order", () => {
    const nodes = [
      makeNode("a", "loader/pdf", { params: { assetId: "asset-1" } }),
      makeNode("b", "loader/page-at", {
        inputType: "pages",
        outputType: "page",
        params: { page_index: 0 },
      }),
      makeNode("c", "surya/layout", {
        inputType: "page",
        outputType: "regions",
      }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "b", target: "c" },
    ];

    expect(collectUpstreamChain("c", nodes, edges)).toEqual(["a", "b"]);
  });
});

describe("getNodeTestRunReadiness", () => {
  it("allows test run when upstream is connected but not yet run", () => {
    const nodes = [
      makeNode("loader", "loader/pdf", { params: { assetId: "asset-1" } }),
      makeNode("layout", "surya/layout", {
        inputType: "page",
        outputType: "regions",
      }),
    ];
    const edges: Edge[] = [{ id: "e1", source: "loader", target: "layout" }];

    const readiness = getNodeTestRunReadiness(
      "layout",
      nodes,
      edges,
      "project-1",
    );

    expect(readiness.ready).toBe(true);
    expect(readiness.issues).toEqual([]);
  });

  it("reports missing source upload in upstream chain", () => {
    const nodes = [
      makeNode("loader", "loader/pdf"),
      makeNode("layout", "surya/layout", {
        inputType: "page",
        outputType: "regions",
      }),
    ];
    const edges: Edge[] = [{ id: "e1", source: "loader", target: "layout" }];

    const readiness = getNodeTestRunReadiness(
      "layout",
      nodes,
      edges,
      "project-1",
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.issues).toContain("Upload a file first");
  });

  it("requires upstream connection when none exists", () => {
    const nodes = [
      makeNode("layout", "surya/layout", {
        inputType: "page",
        outputType: "regions",
      }),
    ];

    const readiness = getNodeTestRunReadiness(
      "layout",
      nodes,
      [],
      "project-1",
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.issues).toContain("Connect an upstream node");
  });

  it("allows picture classifier from page branch without layout regions", () => {
    const pageOutput = {
      kind: "page" as const,
      raw: {
        page_index: 0,
        page: {
          page_index: 0,
          width: 100,
          height: 100,
          image_base64: "abc",
        },
      },
      preview: {
        pageImage: {
          page_index: 0,
          width: 100,
          height: 100,
          image_base64: "abc",
        },
      },
    };

    const nodes = [
      makeNode("pdf", "loader/pdf", {
        params: { assetId: "asset-1" },
        category: "page_loader",
      }),
      makeNode("pageAt", "loader/page-at", {
        inputType: "pages",
        outputType: "page",
        cachedOutput: {
          kind: "pages",
          raw: {
            pages: [
              {
                page_index: 0,
                page: pageOutput.raw.page,
              },
            ],
          },
          preview: {},
        },
      }),
      makeNode("branch", "loader/page-branch", {
        inputType: "pages",
        outputType: "page",
        cachedOutput: pageOutput,
        params: { page_index: 0, parentSelectPageId: "pageAt" },
      }),
      makeNode("classifier", "docling/picture-classifier-v2.5", {
        category: "figure_classification",
        inputType: "PageArtifact (± regions)",
        outputType: "Figure[]",
      }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "pdf", target: "pageAt" },
      { id: "e2", source: "pageAt", target: "branch" },
      {
        id: "e3",
        source: "branch",
        target: "classifier",
        sourceHandle: "item:page:0",
      },
    ];

    const readiness = getNodeTestRunReadiness(
      "classifier",
      nodes,
      edges,
      "project-1",
    );

    expect(readiness.ready).toBe(true);
    expect(readiness.issues).toEqual([]);
  });
});
