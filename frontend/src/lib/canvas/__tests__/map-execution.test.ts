import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import {
  buildMappedOutput,
  canMapNode,
  collectMapPages,
  mappedForPage,
  runMapOverPages,
  upstreamForPage,
} from "@/lib/canvas/map-execution";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";

function node(
  id: string,
  modelId: string,
  cachedOutput: NodeCachedOutput | null,
  params: PipelineNodeData["params"] = {},
): Node<PipelineNodeData> {
  return {
    id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      modelId,
      label: id,
      category: modelId.startsWith("loader")
        ? "page_loader"
        : "layout_detection",
      categoryLabel: "x",
      provider: "surya",
      inputType: "PageArtifact",
      outputType: "PageArtifact + regions",
      params,
      categoryColor: "#000",
      cachedOutput,
    },
  };
}

const pages: NodeCachedOutput = {
  kind: "pages",
  raw: {
    pages: [0, 1, 2].map((i) => ({
      page_index: i,
      page: { page_index: i, width: 10, height: 10, image_base64: `img${i}` },
    })),
  },
};

const loader = node("loader", "loader/pdf", pages);
const select = node("select", "loader/page-at", null, { page_index: 1 });
const layout = node("layout", "surya/layout", {
  kind: "regions",
  raw: {
    page_index: 1,
    regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }],
  },
});
const edges: Edge[] = [
  { id: "e1", source: "loader", target: "select" },
  { id: "e2", source: "select", target: "layout" },
];
const nodes = [loader, select, layout];

describe("map execution", () => {
  it("finds the document pages through Select Page", () => {
    expect(
      collectMapPages("layout", nodes, edges).map((p) => p.page_index),
    ).toEqual([0, 1, 2]);
    expect(canMapNode(layout, nodes, edges)).toBe(true);
    expect(canMapNode(loader, nodes, edges)).toBe(false);
  });

  it("resolves the upstream for a given page from a page collection", () => {
    const page = collectMapPages("layout", nodes, edges)[2];
    const upstream = upstreamForPage(
      "layout",
      2,
      page,
      nodes,
      edges,
      "page_artifact",
    );
    expect(upstream.output?.kind).toBe("page");
    expect(
      (upstream.output?.raw as { page: { page: { image_base64: string } } })
        .page.page.image_base64,
    ).toBe("img2");
  });

  it("resolves the upstream for a given page from a mapped upstream", () => {
    const mappedLayout: Node<PipelineNodeData> = {
      ...layout,
      data: {
        ...layout.data,
        cachedOutput: {
          ...layout.data.cachedOutput!,
          mapped: [0, 1, 2].map((i) => ({
            page_index: i,
            output: {
              kind: "regions" as const,
              raw: {
                page_index: i,
                regions: [{ id: `r${i}`, label: "text", bbox: [0, 0, 1, 1] }],
              },
            },
          })),
        },
      },
    };
    const ocr = node("ocr", "surya/text-detection", null);
    const allNodes = [loader, select, mappedLayout, ocr];
    const allEdges = [...edges, { id: "e3", source: "layout", target: "ocr" }];
    const page = collectMapPages("ocr", allNodes, allEdges)[2];
    const upstream = upstreamForPage("ocr", 2, page, allNodes, allEdges);
    expect(
      (upstream.output?.raw as { regions: Array<{ id: string }> }).regions[0]
        .id,
    ).toBe("r2");
    // pixel page attached for models that need it
    expect(upstream.output?.preview?.pageImage?.image_base64).toBe("img2");
  });

  it("runs every page, records failures, and can resume", async () => {
    const docPages = collectMapPages("layout", nodes, edges);
    const calls: number[] = [];
    const first = await runMapOverPages({
      pages: docPages,
      runPage: async (page) => {
        calls.push(page.page_index);
        if (page.page_index === 1) throw new Error("boom");
        return {
          kind: "regions",
          raw: { page_index: page.page_index, regions: [] },
        };
      },
    });
    expect(calls).toEqual([0, 1, 2]);
    expect(first.map((entry) => entry.page_index)).toEqual([0, 1, 2]);
    expect(first[1].error).toBe("boom");

    // Resume: only the failed page is re-run.
    const resumed: number[] = [];
    const second = await runMapOverPages({
      pages: docPages,
      existing: first,
      runPage: async (page) => {
        resumed.push(page.page_index);
        return {
          kind: "regions",
          raw: { page_index: page.page_index, regions: [] },
        };
      },
    });
    expect(resumed).toEqual([1]);
    expect(second.every((entry) => !entry.error)).toBe(true);
  });

  it("stops when cancelled", async () => {
    let cancel = false;
    const ran: number[] = [];
    const result = await runMapOverPages({
      pages: collectMapPages("layout", nodes, edges),
      shouldCancel: () => cancel,
      runPage: async (page) => {
        ran.push(page.page_index);
        cancel = true;
        return {
          kind: "regions",
          raw: { page_index: page.page_index, regions: [] },
        };
      },
    });
    expect(ran).toEqual([0]);
    expect(result).toHaveLength(1);
  });

  it("merges results while keeping the current page as the visible output", () => {
    const mapped = [0, 1, 2].map((i) => ({
      page_index: i,
      output: {
        kind: "regions" as const,
        raw: { page_index: i, regions: [{ id: `r${i}` }] },
      },
    }));
    const merged = buildMappedOutput(mapped, 1, null);
    expect((merged?.raw as { page_index: number }).page_index).toBe(1);
    expect(merged?.mapped).toHaveLength(3);
    expect(mappedForPage(merged, 2)?.raw).toEqual({
      page_index: 2,
      regions: [{ id: "r2" }],
    });
  });
});
