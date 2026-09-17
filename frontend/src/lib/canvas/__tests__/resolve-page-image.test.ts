import { describe, expect, it } from "vitest";
import { resolveOutputPageImage } from "@/lib/canvas/resolve-upstream";
import type { Node, Edge } from "@xyflow/react";
import type { PipelineNodeData } from "@/lib/canvas/types";

function n(
  id: string,
  modelId: string,
  cachedOutput: unknown,
): Node<PipelineNodeData> {
  return {
    id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      modelId,
      label: id,
      category: "x",
      categoryLabel: "x",
      provider: "p",
      inputType: "a",
      outputType: "b",
      params: {},
      categoryColor: "#000",
      cachedOutput: cachedOutput as never,
    },
  };
}
describe("resolveOutputPageImage", () => {
  it("finds the loader page matching the geometry's page index", () => {
    const loader = n("loader", "loader/pdf", {
      kind: "pages",
      raw: {
        pages: [0, 1, 2, 3].map((i) => ({
          page_index: i,
          page: { page_index: i, width: 1, height: 1, image_base64: `b${i}` },
        })),
      },
    });
    const select = n("select", "loader/page-at", null);
    const layout = n("layout", "docling/layout-heron", {
      kind: "regions",
      raw: { page_index: 3, regions: [{ id: "r1", bbox: [0, 0, 1, 1] }] },
      preview: { pageImage: { page_index: 3, width: 1, height: 1 } },
    });
    const items = n("items", "layout/region-branch", null);
    const edges: Edge[] = [
      { id: "e1", source: "loader", target: "select" },
      { id: "e2", source: "select", target: "layout" },
      { id: "e3", source: "layout", target: "items" },
    ];
    const page = resolveOutputPageImage(
      "items",
      layout.data.cachedOutput ?? null,
      [loader, select, layout, items],
      edges,
    );
    expect(page?.image_base64).toBe("b3");
  });
});
