import { describe, expect, it } from "vitest";

import {
  graphToFlowNodes,
  serializePipelineGraph,
} from "@/lib/canvas/graph-utils";
import { runtimeFromNodeData } from "@/lib/canvas/runtime-utils";
import type { PipelineNodeData, PipelineNodeRecord } from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE } from "@/lib/canvas/types";

function makeNodeData(): PipelineNodeData {
  return {
    modelId: "loader/pdf",
    label: "PDF Loader",
    category: "page_loader",
    categoryLabel: "Page Loader",
    provider: "ocrflow",
    inputType: "none",
    outputType: "PageArtifact[]",
    params: { dpi: 200 },
    categoryColor: "#3685bf",
    cachedOutput: {
      kind: "pages",
      raw: [],
      preview: {
        pageCount: 1,
        thumbnailBase64: "abc123",
        pageImage: {
          page_index: 0,
          width: 100,
          height: 100,
          image_base64: "bigblob",
        },
      },
    },
    runStatus: "success",
    lastRunAt: "2026-01-01T00:00:00.000Z",
    runResult: { pageCount: 1, previewBase64: "abc123" },
  };
}

describe("runtime persistence", () => {
  it("strips binary blobs from runtime before save", () => {
    const runtime = runtimeFromNodeData(makeNodeData());
    expect(runtime?.cachedOutput?.preview?.thumbnailBase64).toBeUndefined();
    expect(runtime?.cachedOutput?.preview?.pageImage?.image_base64).toBeUndefined();
    expect(runtime?.cachedOutput?.preview?.pageCount).toBe(1);
    expect(runtime?.runStatus).toBe("success");
  });

  it("round-trips runtime metadata through graph serialization", () => {
    const data = makeNodeData();
    const flowNode = {
      id: "loader/pdf-abc",
      type: PIPELINE_NODE_TYPE,
      position: { x: 10, y: 20 },
      data,
    };

    const graph = serializePipelineGraph([flowNode], [], { x: 0, y: 0, zoom: 1 });
    const record = graph.nodes[0];
    expect(record.runtime?.runStatus).toBe("success");
    expect(record.runtime?.cachedOutput?.preview?.pageCount).toBe(1);
    expect(record.runtime?.cachedOutput?.preview?.thumbnailBase64).toBeUndefined();

    const restored = graphToFlowNodes(graph, (rec: PipelineNodeRecord) => ({
      ...data,
      params: rec.config ?? data.params,
      ...(rec.runtime
        ? {
            runStatus: rec.runtime.runStatus,
            lastRunAt: rec.runtime.lastRunAt,
            runResult: rec.runtime.runResult,
            outputPanelOpen: rec.runtime.outputPanelOpen,
            cachedOutput: rec.runtime.cachedOutput,
          }
        : {}),
    }));

    expect(restored[0]?.data.runStatus).toBe("success");
    expect(restored[0]?.data.cachedOutput?.preview?.pageCount).toBe(1);
  });
});
