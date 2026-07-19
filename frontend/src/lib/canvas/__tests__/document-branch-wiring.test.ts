import { describe, expect, it } from "vitest";

import {
  buildDocumentBranchCompanionEdge,
  collectDocumentBranchCascadeRemovalIds,
  findDocumentBranchForAnchor,
} from "@/lib/canvas/document-branch-graph";
import {
  DOCUMENT_BRANCH_MODEL_ID,
  PARENT_DOCUMENT_NODE_PARAM,
} from "@/lib/canvas/document-branch-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";
import type { Node } from "@xyflow/react";

function makeNode(
  id: string,
  modelId: string,
  runtime: Partial<PipelineNodeData> = {},
): Node<PipelineNodeData> {
  return {
    id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      modelId,
      label: id,
      category: "vlm_convert",
      categoryLabel: "VLM Convert",
      provider: "docling",
      inputType: "DocumentInput",
      outputType: "DocumentArtifact + markdown",
      params: {},
      categoryColor: "#000",
      ...runtime,
    },
  };
}

describe("document branch graph helpers", () => {
  it("builds companion edge metadata", () => {
    const edge = buildDocumentBranchCompanionEdge("converter", "branch");
    expect(edge.data?.companion).toBe(true);
    expect(edge.source).toBe("converter");
    expect(edge.target).toBe("branch");
  });

  it("cascades branch removal when anchor is removed", () => {
    const nodes = [
      makeNode("converter", "docling/convert-pipeline", {
        documentBranchNodeId: "branch",
      }),
      makeNode("branch", DOCUMENT_BRANCH_MODEL_ID, {
        params: { [PARENT_DOCUMENT_NODE_PARAM]: "converter" },
      }),
    ];

    expect(collectDocumentBranchCascadeRemovalIds(["converter"], nodes)).toEqual([
      "branch",
    ]);
  });

  it("finds branch by parent param", () => {
    const nodes = [
      makeNode("converter", "docling/convert-pipeline"),
      makeNode("branch", DOCUMENT_BRANCH_MODEL_ID, {
        params: { [PARENT_DOCUMENT_NODE_PARAM]: "converter" },
      }),
    ];

    expect(findDocumentBranchForAnchor("converter", nodes)?.id).toBe("branch");
  });
});
