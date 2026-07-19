import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { evaluatePipelineConnection } from "@/lib/canvas/connection-validation";
import { buildItemHandle } from "@/lib/canvas/output-slice";
import {
  buildCompanionEdge,
  collectCascadeRemovalIds,
  isCompanionEdge,
  migratePageAtGraph,
} from "@/lib/canvas/page-branch-graph";
import {
  PAGE_AT_MODEL_ID,
  PAGE_BRANCH_MODEL_ID,
  PARENT_SELECT_PAGE_PARAM,
} from "@/lib/canvas/page-branch-meta";
import {
  getUpstreamContext,
  resolveNodeEffectiveOutput,
} from "@/lib/canvas/resolve-upstream";
import type {
  ModelCatalogEntry,
  NodeCachedOutput,
  PipelineGraph,
  PipelineNodeData,
} from "@/lib/canvas/types";

const upstreamPagesOutput: NodeCachedOutput = {
  kind: "pages",
  raw: {
    pages: [
      {
        page_index: 0,
        page: {
          page_index: 0,
          width: 100,
          height: 100,
          image_base64: "page0",
        },
      },
      {
        page_index: 1,
        page: {
          page_index: 1,
          width: 100,
          height: 100,
          image_base64: "page1",
        },
      },
    ],
  },
  preview: { pageCount: 2 },
};

const pageAtEntry: ModelCatalogEntry = {
  id: PAGE_AT_MODEL_ID,
  category: "page_loader",
  provider: "loader",
  status: "done",
  compute: "cpu",
  license: "MIT",
  python_extra: null,
  display_name: "Select Page",
  notes: null,
};

const pageBranchEntry: ModelCatalogEntry = {
  id: PAGE_BRANCH_MODEL_ID,
  category: "page_loader",
  provider: "loader",
  status: "done",
  compute: "cpu",
  license: "MIT",
  python_extra: null,
  display_name: "Page Branch",
  notes: null,
};

const migrateCtx = {
  modelMap: new Map([
    [PAGE_AT_MODEL_ID, pageAtEntry],
    [PAGE_BRANCH_MODEL_ID, pageBranchEntry],
  ]),
  categoryLabels: new Map([["page_loader", "Page loader"]]),
};

function makeNode(
  id: string,
  modelId: string,
  partial: Partial<PipelineNodeData> = {},
): Node<PipelineNodeData> {
  const outputType =
    modelId === PAGE_AT_MODEL_ID || modelId === PAGE_BRANCH_MODEL_ID
      ? "PageArtifact"
      : partial.outputType ?? "PageArtifact";
  const inputType =
    modelId === PAGE_AT_MODEL_ID || modelId === PAGE_BRANCH_MODEL_ID
      ? "PageArtifact[]"
      : partial.inputType ?? "PageArtifact";

  return {
    id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      label: id,
      modelId,
      category: "page_loader",
      categoryLabel: "Page loader",
      provider: "test",
      inputType,
      outputType,
      params: {},
      categoryColor: "#000000",
      ...partial,
    },
  };
}

function makePipelineGraph(
  nodes: Array<{
    id: string;
    modelId: string;
    config?: Record<string, string | boolean | number>;
    runtime?: PipelineGraph["nodes"][0]["runtime"];
    position?: { x: number; y: number };
  }>,
  edges: PipelineGraph["edges"],
): PipelineGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      modelId: node.modelId,
      position: node.position ?? { x: 0, y: 0 },
      config: node.config,
      runtime: node.runtime,
    })),
    edges,
  };
}

describe("resolveNodeEffectiveOutput (page branch)", () => {
  const nodes = [
    makeNode("loader", "loader/pdf", {
      outputType: "PageArtifact[]",
      cachedOutput: upstreamPagesOutput,
    }),
    makeNode("anchor", PAGE_AT_MODEL_ID, {
      params: { page_index: 1 },
    }),
    makeNode("branch", PAGE_BRANCH_MODEL_ID, {
      params: { page_index: 1, [PARENT_SELECT_PAGE_PARAM]: "anchor" },
    }),
  ];
  const edges: Edge[] = [
    { id: "e1", source: "loader", target: "anchor" },
    {
      id: "e2",
      source: "anchor",
      target: "branch",
      data: { companion: true },
    },
  ];

  it("returns selected page for Select Page anchor node output", () => {
    const anchor = nodes[1];
    const effective = resolveNodeEffectiveOutput(anchor, nodes, edges, "output");
    expect(effective?.kind).toBe("page");
    expect(
      (effective?.raw as { page?: { page_index?: number } }).page?.page_index,
    ).toBe(1);
  });

  it("returns selected page for branch item handle matching page_index", () => {
    const branch = nodes[2];
    const handle = buildItemHandle("page", "1");
    const effective = resolveNodeEffectiveOutput(branch, nodes, edges, handle);
    expect(effective?.kind).toBe("page");
    expect(
      (effective?.raw as { page?: { page_index?: number } }).page?.page_index,
    ).toBe(1);
  });

  it("returns a specific page for branch item page handles", () => {
    const branch = nodes[2];
    const handle = buildItemHandle("page", "0");
    const effective = resolveNodeEffectiveOutput(branch, nodes, edges, handle);
    expect(effective?.kind).toBe("page");
    expect(
      (effective?.raw as { page?: { page_index?: number } }).page?.page_index,
    ).toBe(0);
  });
});

describe("getUpstreamContext from page branch", () => {
  const nodes = [
    makeNode("loader", "loader/pdf", {
      outputType: "PageArtifact[]",
      cachedOutput: upstreamPagesOutput,
    }),
    makeNode("anchor", PAGE_AT_MODEL_ID, { params: { page_index: 0 } }),
    makeNode("branch", PAGE_BRANCH_MODEL_ID, {
      params: { page_index: 0, [PARENT_SELECT_PAGE_PARAM]: "anchor" },
    }),
    makeNode("layout", "surya/layout", {
      category: "layout_detection",
      inputType: "PageArtifact",
      outputType: "PageArtifact + regions",
    }),
  ];

  it("passes selected page downstream from branch row port", () => {
    const edges: Edge[] = [
      { id: "e1", source: "loader", target: "anchor" },
      { id: "e2", source: "anchor", target: "branch", data: { companion: true } },
      {
        id: "e3",
        source: "branch",
        target: "layout",
        sourceHandle: buildItemHandle("page", "0"),
      },
    ];
    const upstream = getUpstreamContext("layout", nodes, edges, "page_artifact");
    expect(upstream.output?.kind).toBe("page");
    expect(
      (upstream.output?.raw as { page?: { page_index?: number } }).page
        ?.page_index,
    ).toBe(0);
  });

  it("passes a specific page downstream from branch row port", () => {
    const edges: Edge[] = [
      { id: "e1", source: "loader", target: "anchor" },
      { id: "e2", source: "anchor", target: "branch", data: { companion: true } },
      {
        id: "e3",
        source: "branch",
        target: "layout",
        sourceHandle: buildItemHandle("page", "1"),
      },
    ];
    const upstream = getUpstreamContext("layout", nodes, edges, "page_artifact");
    expect(upstream.output?.kind).toBe("page");
    expect(
      (upstream.output?.raw as { page?: { page_index?: number } }).page
        ?.page_index,
    ).toBe(1);
  });
});

describe("evaluatePipelineConnection (anchor + branch)", () => {
  const anchor = makeNode("anchor", PAGE_AT_MODEL_ID, {
    pageBranchNodeId: "branch",
    params: { page_index: 0 },
  });
  const branch = makeNode("branch", PAGE_BRANCH_MODEL_ID, {
    params: { page_index: 0, [PARENT_SELECT_PAGE_PARAM]: "anchor" },
  });
  const layout = makeNode("layout", "surya/layout", {
    category: "layout_detection",
    inputType: "PageArtifact",
    outputType: "PageArtifact + regions",
  });

  it("allows companion edge from anchor to its branch", () => {
    expect(evaluatePipelineConnection(anchor, branch, "output")).toBe(true);
  });

  it("allows anchor output to layout detection", () => {
    expect(evaluatePipelineConnection(anchor, layout, "output")).toBe(true);
  });

  it("blocks anchor output to a different branch when one is linked", () => {
    const otherBranch = makeNode("other-branch", PAGE_BRANCH_MODEL_ID, {
      params: { [PARENT_SELECT_PAGE_PARAM]: "other-anchor" },
    });
    expect(evaluatePipelineConnection(anchor, otherBranch, "output")).toBe(false);
  });

  it("blocks branch input from non-parent sources", () => {
    const loader = makeNode("loader", "loader/pdf", {
      outputType: "PageArtifact[]",
      cachedOutput: upstreamPagesOutput,
    });
    expect(evaluatePipelineConnection(loader, branch, "output")).toBe(false);
  });

  it("blocks branch node output handle connections", () => {
    expect(evaluatePipelineConnection(branch, layout, "output")).toBe(false);
  });

  it("allows per-page output without cached output", () => {
    expect(
      evaluatePipelineConnection(
        branch,
        layout,
        buildItemHandle("page", "2"),
      ),
    ).toBe(true);
  });
});

describe("companion edge helpers", () => {
  it("marks companion edges", () => {
    const edge = buildCompanionEdge("anchor", "branch");
    expect(isCompanionEdge(edge)).toBe(true);
    expect(edge.data?.companion).toBe(true);
  });
});

describe("cascade delete", () => {
  it("includes linked branch when anchor is removed", () => {
    const nodes = [
      makeNode("anchor", PAGE_AT_MODEL_ID, { pageBranchNodeId: "branch" }),
      makeNode("branch", PAGE_BRANCH_MODEL_ID, {
        params: { [PARENT_SELECT_PAGE_PARAM]: "anchor" },
      }),
    ];
    expect(collectCascadeRemovalIds(["anchor"], nodes)).toEqual(["branch"]);
  });

  it("does not cascade when branch is already removed", () => {
    const nodes = [
      makeNode("anchor", PAGE_AT_MODEL_ID, { pageBranchNodeId: "branch" }),
    ];
    expect(collectCascadeRemovalIds(["anchor", "branch"], nodes)).toEqual([]);
  });
});

describe("migratePageAtGraph", () => {
  it("spawns branch and rewires legacy downstream edges from anchor", () => {
    const graph = makePipelineGraph(
      [
        {
          id: "anchor",
          modelId: PAGE_AT_MODEL_ID,
          config: { page_index: 1 },
          position: { x: 100, y: 200 },
        },
        {
          id: "layout",
          modelId: "surya/layout",
          position: { x: 500, y: 200 },
        },
      ],
      [
        {
          id: "e-downstream",
          source: "anchor",
          target: "layout",
          sourceHandle: "output",
        },
      ],
    );

    const migrated = migratePageAtGraph(graph, migrateCtx);
    const branch = migrated.nodes.find((n) => n.modelId === PAGE_BRANCH_MODEL_ID);
    expect(branch).toBeDefined();
    expect(branch?.config?.page_index).toBe(1);
    expect(branch?.config?.[PARENT_SELECT_PAGE_PARAM]).toBe("anchor");

    const anchor = migrated.nodes.find((n) => n.id === "anchor");
    expect(anchor?.runtime?.pageBranchNodeId).toBe(branch?.id);
    expect(anchor?.config?.page_index).toBe(1);

    const companion = migrated.edges.find(
      (e) => e.companion && e.source === "anchor" && e.target === branch?.id,
    );
    expect(companion).toBeDefined();

    const downstream = migrated.edges.find((e) => e.id === "e-downstream");
    expect(downstream?.source).toBe(branch?.id);
    expect(downstream?.sourceHandle).toBe(buildItemHandle("page", "1"));
  });

  it("rewrites legacy branch output edges to item page handles", () => {
    const graph = makePipelineGraph(
      [
        {
          id: "anchor",
          modelId: PAGE_AT_MODEL_ID,
          config: { page_index: 2 },
          runtime: { pageBranchNodeId: "branch" },
        },
        {
          id: "branch",
          modelId: PAGE_BRANCH_MODEL_ID,
          config: {
            page_index: 2,
            [PARENT_SELECT_PAGE_PARAM]: "anchor",
          },
        },
        {
          id: "layout",
          modelId: "surya/layout",
        },
      ],
      [
        {
          id: "e-downstream",
          source: "branch",
          target: "layout",
          sourceHandle: "output",
        },
      ],
    );

    const migrated = migratePageAtGraph(graph, migrateCtx);
    const downstream = migrated.edges.find((e) => e.id === "e-downstream");
    expect(downstream?.sourceHandle).toBe(buildItemHandle("page", "2"));
  });

  it("leaves graphs without legacy wiring unchanged", () => {
    const graph = makePipelineGraph(
      [{ id: "anchor", modelId: PAGE_AT_MODEL_ID, config: {} }],
      [],
    );
    const migrated = migratePageAtGraph(graph, migrateCtx);
    expect(migrated).toBe(graph);
  });

  it("passes all upstream pages to Page Branch from Select Page parent", () => {
    const nodes = [
      makeNode("loader", "loader/pdf", {
        outputType: "PageArtifact[]",
        cachedOutput: upstreamPagesOutput,
      }),
      makeNode("anchor", PAGE_AT_MODEL_ID, { params: { page_index: 1 } }),
      makeNode("branch", PAGE_BRANCH_MODEL_ID, {
        params: { page_index: 1, [PARENT_SELECT_PAGE_PARAM]: "anchor" },
      }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "loader", target: "anchor" },
      { id: "e2", source: "anchor", target: "branch", sourceHandle: "output" },
    ];
    const upstream = getUpstreamContext("branch", nodes, edges, "page_artifact_array");
    expect(upstream.output?.kind).toBe("pages");
    expect(
      ((upstream.output?.raw as { pages?: unknown[] }).pages ?? []).length,
    ).toBe(2);
  });
});
