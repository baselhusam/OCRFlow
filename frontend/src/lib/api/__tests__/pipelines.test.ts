import { describe, expect, it } from "vitest";

import type { Pipeline } from "@/lib/api/client";
import { isPipelineReady } from "@/lib/api/pipelines";

function pipelineWithNodes(count: number): Pipeline {
  return {
    input_wire_kind: "page_artifact",
    output_wire_kind: "json",
    graph: {
      nodes: Array.from({ length: count }, (_, index) => ({
        id: `node-${index}`,
      })),
      edges: [],
    },
  } as unknown as Pipeline;
}

describe("pipeline readiness", () => {
  it("accepts a valid atomic reusable pipeline", () => {
    expect(isPipelineReady(pipelineWithNodes(1))).toBe(true);
  });

  it("rejects an empty graph", () => {
    expect(isPipelineReady(pipelineWithNodes(0))).toBe(false);
  });
});
