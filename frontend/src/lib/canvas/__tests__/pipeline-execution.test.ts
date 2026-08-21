import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { getPipelineReadiness } from "@/lib/canvas/pipeline-execution";
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

describe("getPipelineReadiness", () => {
  it("requires upstream output when not running the full pipeline", () => {
    const nodes = [
      makeNode("loader", "loader/pdf", { params: { assetId: "asset-1" } }),
      makeNode("layout", "surya/layout", {
        inputType: "page",
        outputType: "regions",
      }),
    ];
    const edges: Edge[] = [{ id: "e1", source: "loader", target: "layout" }];

    const readiness = getPipelineReadiness(nodes, edges, "project-1");

    expect(readiness.ready).toBe(false);
    expect(readiness.issues).toContain("layout: Run the upstream node first");
  });

  it("allows full pipeline run when upstream is connected but not yet run", () => {
    const nodes = [
      makeNode("loader", "loader/pdf", { params: { assetId: "asset-1" } }),
      makeNode("layout", "surya/layout", {
        inputType: "page",
        outputType: "regions",
      }),
    ];
    const edges: Edge[] = [{ id: "e1", source: "loader", target: "layout" }];

    const readiness = getPipelineReadiness(nodes, edges, "project-1", {
      forFullRun: true,
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.steps.every((step) => step.ready)).toBe(true);
  });
});
