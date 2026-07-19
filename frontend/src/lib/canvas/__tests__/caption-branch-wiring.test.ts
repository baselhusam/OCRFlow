import { describe, expect, it } from "vitest";

import {
  buildCaptionBranchCompanionEdge,
  collectCaptionBranchCascadeRemovalIds,
  findCaptionBranchForAnchor,
} from "@/lib/canvas/caption-branch-graph";
import {
  CAPTION_BRANCH_MODEL_ID,
  PARENT_CAPTION_NODE_PARAM,
} from "@/lib/canvas/caption-branch-meta";
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
      category: "figure_captioning",
      categoryLabel: "Figure Captioning",
      provider: "docling",
      inputType: "Figure[]",
      outputType: "TextLine[] (with text)",
      params: {},
      categoryColor: "#000",
      ...runtime,
    },
  };
}

describe("caption branch graph helpers", () => {
  it("builds companion edge metadata", () => {
    const edge = buildCaptionBranchCompanionEdge("caption", "branch");
    expect(edge.data?.companion).toBe(true);
    expect(edge.source).toBe("caption");
    expect(edge.target).toBe("branch");
  });

  it("cascades branch removal when anchor is removed", () => {
    const nodes = [
      makeNode("caption", "docling/picture-description-smolvlm", {
        captionBranchNodeId: "branch",
      }),
      makeNode("branch", CAPTION_BRANCH_MODEL_ID, {
        params: { [PARENT_CAPTION_NODE_PARAM]: "caption" },
      }),
    ];

    expect(collectCaptionBranchCascadeRemovalIds(["caption"], nodes)).toEqual([
      "branch",
    ]);
  });

  it("finds branch by parent param", () => {
    const nodes = [
      makeNode("caption", "docling/picture-description-smolvlm"),
      makeNode("branch", CAPTION_BRANCH_MODEL_ID, {
        params: { [PARENT_CAPTION_NODE_PARAM]: "caption" },
      }),
    ];

    expect(findCaptionBranchForAnchor("caption", nodes)?.id).toBe("branch");
  });
});
