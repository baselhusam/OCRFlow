import { describe, expect, it } from "vitest";

import { derivePipelineBoundaryIO } from "@/lib/canvas/pipeline-boundary";
import { areWireKindsCompatible, getNodeWireKinds } from "@/lib/canvas/wire-types";

const VALID_GRAPH_NODES = [
  {
    id: "entry-1",
    modelId: "surya/layout",
    position: { x: 0, y: 0 },
  },
  {
    id: "exit-1",
    modelId: "surya/text-detection",
    position: { x: 200, y: 0 },
  },
];

const VALID_GRAPH_EDGES = [
  {
    id: "e1",
    source: "entry-1",
    target: "exit-1",
  },
];

describe("derivePipelineBoundaryIO", () => {
  it("derives single entry and exit I/O", () => {
    const result = derivePipelineBoundaryIO(
      VALID_GRAPH_NODES,
      VALID_GRAPH_EDGES,
    );
    expect(result.valid).toBe(true);
    expect(result.inputWireKind).toBe("page_artifact");
    expect(result.outputWireKind).toBe("text_line_array");
    expect(result.inputLabel).toBe("PageArtifact");
    expect(result.outputLabel).toBe("TextLine[]");
  });

  it("accepts docling layout middle-layer chains", () => {
    const result = derivePipelineBoundaryIO(
      [
        {
          id: "layout-1",
          modelId: "docling/layout-heron",
          position: { x: 0, y: 0 },
        },
        {
          id: "detect-1",
          modelId: "surya/text-detection",
          position: { x: 200, y: 0 },
        },
        {
          id: "recognize-1",
          modelId: "surya/text-recognition",
          position: { x: 400, y: 0 },
        },
      ],
      [
        { id: "e1", source: "layout-1", target: "detect-1" },
        { id: "e2", source: "detect-1", target: "recognize-1" },
      ],
    );
    expect(result.valid).toBe(true);
    expect(result.inputLabel).toBe("PageArtifact");
    expect(result.outputLabel).toBe("TextLine[] (with text)");
  });

  it("accepts an atomic model as a reusable pipeline", () => {
    const result = derivePipelineBoundaryIO(
      [
        {
          id: "vision-1",
          modelId: "ollama/vision-structured-extract",
          position: { x: 0, y: 0 },
        },
      ],
      [],
    );
    expect(result.valid).toBe(true);
    expect(result.inputWireKind).toBe("page_artifact");
    expect(result.outputWireKind).toBe("json");
    expect(result.inputLabel).toBe("PageArtifact");
    expect(result.outputLabel).toBe("JSON");
  });

  it("allows mixed sinks and prefers JSON as the primary output", () => {
    const result = derivePipelineBoundaryIO(
      [
        {
          id: "layout-1",
          modelId: "surya/layout",
          position: { x: 0, y: 0 },
        },
        {
          id: "detect-1",
          modelId: "surya/text-detection",
          position: { x: 200, y: 0 },
        },
        {
          id: "recognize-1",
          modelId: "surya/text-recognition",
          position: { x: 400, y: 0 },
        },
        {
          id: "extract-1",
          modelId: "ollama/structured-extract",
          position: { x: 600, y: 0 },
        },
        {
          id: "table-1",
          modelId: "surya/table-recognition",
          position: { x: 200, y: 200 },
        },
      ],
      [
        { id: "e1", source: "layout-1", target: "detect-1" },
        { id: "e2", source: "detect-1", target: "recognize-1" },
        { id: "e3", source: "recognize-1", target: "extract-1" },
        { id: "e4", source: "layout-1", target: "table-1" },
      ],
    );
    expect(result.valid).toBe(true);
    expect(result.inputWireKind).toBe("page_artifact");
    expect(result.outputWireKind).toBe("json");
    expect(result.outputLabel).toBe("JSON + TableStructure[]");
    expect(result.exitNodeIds.sort()).toEqual(["extract-1", "table-1"]);
  });

  it("rejects incompatible connections", () => {
    const result = derivePipelineBoundaryIO(
      [
        {
          id: "layout-1",
          modelId: "surya/layout",
          position: { x: 0, y: 0 },
        },
        {
          id: "vlm-1",
          modelId: "docling/vlm-granite-docling",
          position: { x: 200, y: 0 },
        },
      ],
      [{ id: "e1", source: "layout-1", target: "vlm-1" }],
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("incompatible_connection");
  });

  it("rejects file loaders", () => {
    const result = derivePipelineBoundaryIO(
      [
        {
          id: "loader-1",
          modelId: "loader/pdf",
          position: { x: 0, y: 0 },
        },
      ],
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("contains_file_loader");
  });
});

describe("custom pipeline wire compatibility", () => {
  it("uses stored wire kinds on custom pipeline nodes", () => {
    const kinds = getNodeWireKinds({
      modelId: "custom-pipeline/abc",
      inputType: "PageArtifact",
      outputType: "TextLine[]",
      inputWireKind: "page_artifact",
      outputWireKind: "text_line_array",
    });
    expect(kinds.input).toBe("page_artifact");
    expect(kinds.output).toBe("text_line_array");
    expect(areWireKindsCompatible(kinds.output, kinds.input)).toBe(false);
    expect(areWireKindsCompatible("page_artifact", kinds.input)).toBe(true);
  });
});
