import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import type { PipelineNodeData } from "@/lib/canvas/types";
import { graphFromCanvasSelection } from "@/lib/pipelines/selection-to-graph";

function node(
  id: string,
  modelId: string,
  selected = false,
): Node<PipelineNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    selected,
    data: {
      modelId,
      label: modelId,
      category: "layout_detection",
      categoryLabel: "Layout",
      provider: "surya",
      inputType: "PageArtifact",
      outputType: "PageArtifact + regions",
      params: {},
      categoryColor: "#5B2EEF",
    },
  };
}

describe("graphFromCanvasSelection", () => {
  it("strips PDF loaders and derives I/O from the remaining chain", () => {
    const nodes = [
      node("loader", "loader/pdf", true),
      node("layout", "surya/layout", true),
      node("detect", "surya/text-detection", true),
    ];
    const edges: Edge[] = [
      { id: "e0", source: "loader", target: "layout" },
      { id: "e1", source: "layout", target: "detect" },
    ];

    const draft = graphFromCanvasSelection(nodes, edges);
    expect(draft.strippedLoaderCount).toBe(1);
    expect(draft.graph.nodes.map((item) => item.modelId)).toEqual([
      "surya/layout",
      "surya/text-detection",
    ]);
    expect(draft.boundary.valid).toBe(true);
    expect(draft.boundary.inputWireKind).toBe("page_artifact");
  });

  it("uses the full canvas when nothing is selected", () => {
    const nodes = [
      node("layout", "surya/layout"),
      node("detect", "surya/text-detection"),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "layout", target: "detect" },
    ];
    const draft = graphFromCanvasSelection(nodes, edges);
    expect(draft.usedFullCanvas).toBe(true);
    expect(draft.graph.nodes).toHaveLength(2);
    expect(draft.boundary.valid).toBe(true);
  });
});
