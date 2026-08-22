import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import {
  isDuplicatePipelineConnection,
  isPipelineGraphConnectionAllowed,
  suggestedConnectionForInsertedNode,
} from "@/lib/canvas/connection-validation";
import { buildItemHandle } from "@/lib/canvas/output-slice";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";

function makeNode(
  id: string,
  modelId: string,
  category: string,
  inputType: string,
  outputType: string,
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
      inputType,
      outputType,
      params: {},
      categoryColor: "#000",
      cachedOutput: cachedOutput ?? null,
    },
  };
}

describe("isDuplicatePipelineConnection", () => {
  it("treats null and output source handles as the same wire", () => {
    const edges: Edge[] = [
      {
        id: "e1",
        source: "a",
        target: "b",
        sourceHandle: "output",
        targetHandle: "input",
      },
    ];

    expect(
      isDuplicatePipelineConnection(
        {
          source: "a",
          target: "b",
          sourceHandle: null,
          targetHandle: null,
        },
        edges,
      ),
    ).toBe(true);
  });
});

describe("isPipelineGraphConnectionAllowed", () => {
  const loader = makeNode(
    "loader-1",
    "loader/pdf",
    "page_loader",
    "File",
    "PageArtifact[]",
  );
  const layoutA = makeNode(
    "layout-a",
    "docling/layout-heron",
    "layout_detection",
    "PageArtifact[]",
    "PageArtifact + regions",
  );
  const layoutB = makeNode(
    "layout-b",
    "surya/layout",
    "layout_detection",
    "PageArtifact[]",
    "PageArtifact + regions",
  );

  it("allows fan-out from the same output handle to multiple targets", () => {
    const edges: Edge[] = [
      {
        id: "e1",
        source: "loader-1",
        target: "layout-a",
        sourceHandle: "output",
        targetHandle: "input",
      },
    ];

    const allowed = isPipelineGraphConnectionAllowed(
      {
        source: "loader-1",
        target: "layout-b",
        sourceHandle: "output",
        targetHandle: "input",
      },
      edges,
      [loader, layoutA, layoutB],
    );

    expect(allowed).toBe(true);
  });

  it("allows the same item handle to connect to multiple downstream nodes", () => {
    const regionsOutput: NodeCachedOutput = {
      kind: "regions",
      raw: {
        page_index: 0,
        regions: [
          {
            id: "r1",
            label: "figure",
            docling_label: "PICTURE",
            bbox: [0.2, 0.2, 0.5, 0.5],
            confidence: 0.95,
          },
        ],
      },
      preview: { itemCount: 1 },
    };
    const layout = makeNode(
      "layout-1",
      "docling/layout-heron",
      "layout_detection",
      "PageArtifact",
      "PageArtifact + regions",
      regionsOutput,
    );
    const pictureA = makeNode(
      "pic-a",
      "docling/picture-description-smolvlm",
      "figure_captioning",
      "Figure[]",
      "TextLine[] (with text)",
    );
    const pictureB = makeNode(
      "pic-b",
      "docling/picture-description-smolvlm",
      "figure_captioning",
      "Figure[]",
      "TextLine[] (with text)",
    );
    const handle = buildItemHandle("region", "r1");
    const edges: Edge[] = [
      {
        id: "e1",
        source: "layout-1",
        target: "pic-a",
        sourceHandle: handle,
        targetHandle: "input",
      },
    ];

    const allowed = isPipelineGraphConnectionAllowed(
      {
        source: "layout-1",
        target: "pic-b",
        sourceHandle: handle,
        targetHandle: "input",
      },
      edges,
      [layout, pictureA, pictureB],
    );

    expect(allowed).toBe(true);
  });

  it("rejects exact duplicate wires", () => {
    const edges: Edge[] = [
      {
        id: "e1",
        source: "loader-1",
        target: "layout-a",
        sourceHandle: "output",
        targetHandle: "input",
      },
    ];

    const allowed = isPipelineGraphConnectionAllowed(
      {
        source: "loader-1",
        target: "layout-a",
        sourceHandle: "output",
        targetHandle: "input",
      },
      edges,
      [loader, layoutA, layoutB],
    );

    expect(allowed).toBe(false);
  });
});

describe("suggestedConnectionForInsertedNode", () => {
  it("wires a selected loader into a newly inserted layout node", () => {
    const loader = makeNode(
      "loader-1",
      "loader/image",
      "page_loader",
      "file",
      "file",
    );
    const layout = makeNode(
      "layout-1",
      "surya/layout",
      "layout_detection",
      "page",
      "regions",
    );

    expect(suggestedConnectionForInsertedNode(loader, layout)).toEqual({
      source: "loader-1",
      target: "layout-1",
      sourceHandle: "output",
      targetHandle: "input",
    });
  });
});
