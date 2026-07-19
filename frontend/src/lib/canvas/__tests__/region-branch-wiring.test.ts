import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { evaluatePipelineConnection } from "@/lib/canvas/connection-validation";
import { buildItemHandle } from "@/lib/canvas/output-slice";
import {
  buildRegionBranchCompanionEdge,
  collectRegionBranchCascadeRemovalIds,
  findRegionBranchForAnchor,
} from "@/lib/canvas/region-branch-graph";
import {
  PARENT_LAYOUT_NODE_PARAM,
  REGION_BRANCH_MODEL_ID,
} from "@/lib/canvas/region-branch-meta";
import {
  getUpstreamContext,
  resolveNodeEffectiveOutput,
  sliceOutputByHandle,
} from "@/lib/canvas/resolve-upstream";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";

const layoutRegionsOutput: NodeCachedOutput = {
  kind: "regions",
  raw: {
    page_index: 0,
    regions: [
      {
        id: "r1",
        label: "paragraph",
        bbox: [0.1, 0.1, 0.4, 0.3],
        confidence: 0.92,
      },
      {
        id: "r2",
        label: "table",
        bbox: [0.5, 0.5, 0.9, 0.9],
        confidence: 0.88,
      },
    ],
  },
  preview: { itemCount: 2 },
};

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
      category: "layout_detection",
      categoryLabel: "Layout Detection",
      provider: "test",
      inputType: "PageArtifact",
      outputType: "PageArtifact + regions",
      params: {},
      categoryColor: "#000000",
      ...partial,
    },
  };
}

describe("region branch wiring", () => {
  it("builds companion edges", () => {
    const edge = buildRegionBranchCompanionEdge("layout", "branch");
    expect(edge.data?.companion).toBe(true);
    expect(edge.source).toBe("layout");
    expect(edge.target).toBe("branch");
  });

  it("cascades branch removal when layout anchor is removed", () => {
    const nodes = [
      makeNode("layout", "surya/layout", { regionBranchNodeId: "branch" }),
      makeNode("branch", REGION_BRANCH_MODEL_ID, {
        params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
      }),
    ];
    expect(collectRegionBranchCascadeRemovalIds(["layout"], nodes)).toEqual([
      "branch",
    ]);
  });

  it("finds branch for anchor", () => {
    const nodes = [
      makeNode("layout", "surya/layout"),
      makeNode("branch", REGION_BRANCH_MODEL_ID, {
        params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
      }),
    ];
    expect(findRegionBranchForAnchor("layout", nodes)?.id).toBe("branch");
  });

  it("resolves region branch upstream from parent cached output", () => {
    const nodes = [
      makeNode("layout", "surya/layout", { cachedOutput: layoutRegionsOutput }),
      makeNode("branch", REGION_BRANCH_MODEL_ID, {
        params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
      }),
    ];
    const edges: Edge[] = [
      {
        id: "companion",
        source: "layout",
        target: "branch",
        sourceHandle: "output",
        targetHandle: "input",
      },
    ];

    const upstream = getUpstreamContext("branch", nodes, edges);
    expect(upstream.output?.kind).toBe("regions");
    expect(
      (upstream.output?.raw as { regions?: unknown[] }).regions?.length,
    ).toBe(2);
  });

  it("slices single region from branch output handle", () => {
    const branch = makeNode("branch", REGION_BRANCH_MODEL_ID, {
      params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
    });
    const layout = makeNode("layout", "surya/layout", {
      cachedOutput: layoutRegionsOutput,
    });
    const nodes = [layout, branch];
    const edges: Edge[] = [];

    const effective = resolveNodeEffectiveOutput(
      branch,
      nodes,
      edges,
      buildItemHandle("region", "r1"),
    );
    const regions = (effective?.raw as { regions?: Array<{ id: string }> }).regions;
    expect(regions).toHaveLength(1);
    expect(regions?.[0]?.id).toBe("r1");
  });

  it("blocks region branch input from non-parent layout nodes", () => {
    const layout = makeNode("layout", "surya/layout");
    const other = makeNode("other", "surya/layout");
    const branch = makeNode("branch", REGION_BRANCH_MODEL_ID, {
      params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
    });

    expect(
      evaluatePipelineConnection(other, branch, "output", [layout, other, branch]),
    ).toBe(false);
    expect(
      evaluatePipelineConnection(layout, branch, "output", [layout, other, branch]),
    ).toBe(true);
  });

  it("blocks branch node output handle connections", () => {
    const layout = makeNode("layout", "surya/layout", {
      cachedOutput: layoutRegionsOutput,
    });
    const branch = makeNode("branch", REGION_BRANCH_MODEL_ID, {
      params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
    });

    expect(evaluatePipelineConnection(branch, layout, "output")).toBe(false);
  });

  it("allows per-region output without cached output", () => {
    const layout = makeNode("layout", "surya/layout");
    const branch = makeNode("branch", REGION_BRANCH_MODEL_ID, {
      params: { [PARENT_LAYOUT_NODE_PARAM]: "layout" },
    });
    const target = makeNode("text", "surya/text-detection", {
      category: "text_detection",
      inputType: "PageArtifact + regions",
      outputType: "TextLine[]",
    });

    expect(
      evaluatePipelineConnection(
        branch,
        target,
        buildItemHandle("region", "r1"),
        [layout, branch, target],
      ),
    ).toBe(true);
  });

  it("slices layout anchor output by region handle", () => {
    const sliced = sliceOutputByHandle(
      layoutRegionsOutput,
      buildItemHandle("region", "r2"),
    );
    const regions = (sliced?.raw as { regions?: Array<{ id: string }> }).regions;
    expect(regions).toHaveLength(1);
    expect(regions?.[0]?.id).toBe("r2");
  });
});
