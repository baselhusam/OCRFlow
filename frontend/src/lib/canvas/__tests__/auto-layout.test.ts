import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import {
  autoLayoutNodes,
  estimateMainBounds,
  estimateNodeBounds,
  estimateOutputPanelWidth,
  isOutputPanelVisible,
  resolveFootprintBounds,
  resolveMainBounds,
} from "@/lib/canvas/auto-layout";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";

function makeNode(
  id: string,
  modelId: string,
  category: string,
  options?: {
    outputPanelOpen?: boolean;
    cachedOutput?: NodeCachedOutput | null;
    pageBranchNodeId?: string;
    regionBranchNodeId?: string;
  },
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
      inputType: "PageArtifact",
      outputType: "PageArtifact",
      params: {},
      categoryColor: "#000",
      outputPanelOpen: options?.outputPanelOpen,
      pageBranchNodeId: options?.pageBranchNodeId,
      regionBranchNodeId: options?.regionBranchNodeId,
      cachedOutput: options?.cachedOutput ?? null,
    },
  };
}

describe("estimateMainBounds", () => {
  it("uses compact bounds when the output panel is collapsed", () => {
    const bounds = estimateMainBounds(
      makeNode("loader", "loader/pdf", "page_loader", {
        outputPanelOpen: false,
        cachedOutput: {
          kind: "pages",
          raw: { pages: [] },
          preview: { pageCount: 12 },
        },
      }),
    );

    expect(bounds.width).toBe(260);
    expect(bounds.height).toBeLessThan(260);
  });

  it("uses compact main bounds when the output panel is open", () => {
    const bounds = estimateMainBounds(
      makeNode("layout", "docling/layout-heron", "layout_detection", {
        outputPanelOpen: true,
        cachedOutput: {
          kind: "regions",
          raw: { regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }] },
          preview: { itemCount: 1 },
        },
      }),
    );

    expect(bounds.width).toBe(260);
    expect(bounds.height).toBeLessThan(260);
  });

  it("keeps estimateNodeBounds as an alias for main bounds", () => {
    const node = makeNode("loader", "loader/pdf", "page_loader");
    expect(estimateNodeBounds(node)).toEqual(estimateMainBounds(node));
  });
});

describe("resolveFootprintBounds", () => {
  it("expands horizontally and vertically when the output panel is open", () => {
    const node = makeNode("layout", "docling/layout-heron", "layout_detection", {
      outputPanelOpen: true,
      cachedOutput: {
        kind: "regions",
        raw: { regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }] },
        preview: { itemCount: 1 },
      },
    });
    const main = estimateMainBounds(node);
    const footprint = resolveFootprintBounds(node, main);

    expect(footprint.width).toBe(260 + 16 + 224);
    expect(footprint.height).toBe(360);
  });

  it("matches main bounds when the panel is closed", () => {
    const node = makeNode("layout", "docling/layout-heron", "layout_detection", {
      outputPanelOpen: false,
      cachedOutput: {
        kind: "regions",
        raw: { regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }] },
        preview: { itemCount: 1 },
      },
    });
    const main = estimateMainBounds(node);
    expect(resolveFootprintBounds(node, main)).toEqual(main);
  });

  it("does not reserve output panel space for a select page with a page branch", () => {
    const node = makeNode("select", "loader/page-at", "page_loader", {
      outputPanelOpen: true,
      pageBranchNodeId: "branch",
      cachedOutput: {
        kind: "pages",
        raw: { pages: [] },
        preview: { pageCount: 12 },
      },
    });
    const main = estimateMainBounds(node);

    expect(isOutputPanelVisible(node.data)).toBe(false);
    expect(resolveFootprintBounds(node, main)).toEqual(main);
  });

  it("does not reserve output panel space for a layout node with a region branch", () => {
    const node = makeNode("layout", "surya/layout", "layout_detection", {
      outputPanelOpen: true,
      regionBranchNodeId: "branch",
      cachedOutput: {
        kind: "regions",
        raw: { regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }] },
        preview: { itemCount: 1 },
      },
    });
    const main = estimateMainBounds(node);

    expect(isOutputPanelVisible(node.data)).toBe(false);
    expect(resolveFootprintBounds(node, main)).toEqual(main);
  });
});

describe("estimateOutputPanelWidth", () => {
  it("uses layout page width for layout detection regions", () => {
    const width = estimateOutputPanelWidth({
      category: "layout_detection",
      cachedOutput: {
        kind: "regions",
        raw: { regions: [{ id: "r1" }] },
      },
    } as PipelineNodeData);
    expect(width).toBe(224);
  });

  it("uses regions width for non-layout region outputs", () => {
    const width = estimateOutputPanelWidth({
      category: "ocr",
      cachedOutput: {
        kind: "regions",
        raw: { regions: [{ id: "r1" }] },
      },
    } as PipelineNodeData);
    expect(width).toBe(192);
  });
});

describe("autoLayoutNodes", () => {
  it("spaces fork siblings using main node heights", () => {
    const nodes = [
      makeNode("loader", "loader/pdf", "page_loader", {
        cachedOutput: {
          kind: "pages",
          raw: {},
          preview: { pageCount: 3 },
        },
      }),
      makeNode("select", "loader/page-at", "page_loader", {
        cachedOutput: { kind: "page", raw: { page_index: 0 } },
      }),
      makeNode("layout", "docling/layout-heron", "layout_detection", {
        cachedOutput: {
          kind: "regions",
          raw: { regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }] },
          preview: { itemCount: 1 },
        },
      }),
      makeNode("caption", "docling/picture-description-smolvlm", "figure_captioning", {
        cachedOutput: { kind: "figures", raw: { figures: [] } },
      }),
      makeNode("order", "docling/reading-order", "reading_order", {
        cachedOutput: { kind: "reading_order", raw: {} },
      }),
    ];

    const edges: Edge[] = [
      { id: "e1", source: "loader", target: "select" },
      { id: "e2", source: "select", target: "layout" },
      { id: "e3", source: "layout", target: "caption" },
      { id: "e4", source: "layout", target: "order" },
    ];

    const laidOut = autoLayoutNodes(nodes, edges);
    const byId = new Map(laidOut.map((node) => [node.id, node.position]));
    const caption = byId.get("caption");
    const order = byId.get("order");
    const layout = byId.get("layout");

    expect(caption?.x).toBe(order?.x);
    expect((order?.y ?? 0) - (caption?.y ?? 0)).toBeGreaterThanOrEqual(240);

    const captionBounds = estimateMainBounds(
      nodes.find((node) => node.id === "caption")!,
    );
    const orderBounds = estimateMainBounds(
      nodes.find((node) => node.id === "order")!,
    );
    const layoutBounds = estimateMainBounds(
      nodes.find((node) => node.id === "layout")!,
    );

    const forkCenter =
      (caption!.y + captionBounds.height / 2 + order!.y + orderBounds.height / 2) /
      2;
    const layoutCenter = layout!.y + layoutBounds.height / 2;

    expect(Math.abs(layoutCenter - forkCenter)).toBeLessThan(40);
  });

  it("uses measured main height when provided", () => {
    const nodes = [
      makeNode("a", "loader/pdf", "page_loader"),
      makeNode("b", "docling/layout-heron", "layout_detection"),
    ];
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    const measuredMainHeights = new Map([["a", 520]]);

    const laidOut = autoLayoutNodes(nodes, edges, measuredMainHeights);
    const b = laidOut.find((node) => node.id === "b");

    expect(resolveMainBounds(nodes[0], 520).height).toBe(520);
    expect(b?.position.x).toBe(80 + 260 + 64);
  });

  it("leaves room for an open output panel in the next column", () => {
    const nodes = [
      makeNode("loader", "loader/pdf", "page_loader", {
        outputPanelOpen: true,
        cachedOutput: {
          kind: "pages",
          raw: { pages: [] },
          preview: { pageCount: 3 },
        },
      }),
      makeNode("layout", "docling/layout-heron", "layout_detection"),
    ];
    const edges: Edge[] = [{ id: "e1", source: "loader", target: "layout" }];

    const laidOut = autoLayoutNodes(nodes, edges);
    const loader = laidOut.find((node) => node.id === "loader")!;
    const layout = laidOut.find((node) => node.id === "layout")!;

    const loaderMain = estimateMainBounds(nodes[0]);
    const loaderFootprint = resolveFootprintBounds(nodes[0], loaderMain);

    expect(layout.position.x).toBeGreaterThanOrEqual(
      loader.position.x + loaderFootprint.width + 64,
    );
  });

  it("uses panel footprint height for fork siblings when a panel is open", () => {
    const nodes = [
      makeNode("layout", "docling/layout-heron", "layout_detection", {
        cachedOutput: {
          kind: "regions",
          raw: { regions: [{ id: "r1", label: "text", bbox: [0, 0, 1, 1] }] },
          preview: { itemCount: 1 },
        },
      }),
      makeNode("caption", "docling/picture-description-smolvlm", "figure_captioning", {
        outputPanelOpen: true,
        cachedOutput: {
          kind: "figures",
          raw: { figures: [{ id: "f1" }] },
          preview: { itemCount: 1 },
        },
      }),
      makeNode("order", "docling/reading-order", "reading_order"),
    ];

    const edges: Edge[] = [
      { id: "e1", source: "layout", target: "caption" },
      { id: "e2", source: "layout", target: "order" },
    ];

    const laidOut = autoLayoutNodes(nodes, edges);
    const byId = new Map(laidOut.map((node) => [node.id, node.position]));
    const caption = byId.get("caption")!;
    const order = byId.get("order")!;

    const captionFootprint = resolveFootprintBounds(
      nodes.find((node) => node.id === "caption")!,
      estimateMainBounds(nodes.find((node) => node.id === "caption")!),
    );

    expect(order.y - caption.y).toBeGreaterThanOrEqual(
      captionFootprint.height + 56,
    );
  });

  it("keeps many parallel siblings from overlapping in the same column", () => {
    const nodes = [
      makeNode("root", "loader/pdf", "page_loader"),
      ...Array.from({ length: 8 }, (_, index) =>
        makeNode(`child-${index}`, "docling/layout-heron", "layout_detection", {
          cachedOutput: {
            kind: "regions",
            raw: { regions: [{ id: `r${index}`, label: "text", bbox: [0, 0, 1, 1] }] },
            preview: { itemCount: 1 },
          },
        }),
      ),
    ];

    const edges: Edge[] = Array.from({ length: 8 }, (_, index) => ({
      id: `e-${index}`,
      source: "root",
      target: `child-${index}`,
    }));

    const laidOut = autoLayoutNodes(nodes, edges);
    const children = laidOut.filter((node) => node.id.startsWith("child-"));
    const sorted = [...children].sort((a, b) => a.position.y - b.position.y);

    for (let index = 1; index < sorted.length; index++) {
      const prev = sorted[index - 1];
      const curr = sorted[index];
      const prevFootprint = resolveFootprintBounds(
        nodes.find((node) => node.id === prev.id)!,
        estimateMainBounds(nodes.find((node) => node.id === prev.id)!),
      );

      expect(curr.position.x).toBe(prev.position.x);
      expect(curr.position.y).toBeGreaterThanOrEqual(
        prev.position.y + prevFootprint.height + 56,
      );
    }
  });

  it("places satellite branch nodes beside their anchor", () => {
    const selectNode = makeNode("select", "loader/page-at", "page_loader", {
      pageBranchNodeId: "branch",
      cachedOutput: {
        kind: "pages",
        raw: { pages: [] },
        preview: { pageCount: 3 },
      },
    });
    const branchNode = makeNode("branch", "loader/page-branch", "page_loader", {
      cachedOutput: {
        kind: "pages",
        raw: { pages: [] },
        preview: { pageCount: 3 },
      },
    });
    branchNode.data = {
      ...branchNode.data,
      params: { parentSelectPageId: "select", page_index: 0 },
    };

    const nodes = [
      selectNode,
      branchNode,
      makeNode("layout", "docling/layout-heron", "layout_detection"),
    ];

    const edges: Edge[] = [
      { id: "e1", source: "select", target: "branch" },
      { id: "e2", source: "branch", target: "layout" },
    ];

    const laidOut = autoLayoutNodes(nodes, edges);
    const select = laidOut.find((node) => node.id === "select")!;
    const branch = laidOut.find((node) => node.id === "branch")!;
    const selectFootprint = resolveFootprintBounds(
      select,
      estimateMainBounds(select),
    );

    expect(branch.position.x).toBeGreaterThanOrEqual(
      select.position.x + selectFootprint.width + 16,
    );
    expect(Math.abs(branch.position.y - select.position.y)).toBeLessThan(200);
  });
});
