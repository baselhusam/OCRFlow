import { describe, expect, it } from "vitest";

import { formatArtifactKind, formatWireLabel } from "@/lib/canvas/wire-labels";

describe("formatWireLabel", () => {
  it("maps internal wire type strings to human labels", () => {
    expect(formatWireLabel("DocumentInput")).toBe("File");
    expect(formatWireLabel("File")).toBe("File");
    expect(formatWireLabel("PageArtifact")).toBe("Image");
    expect(formatWireLabel("PageArtifact[]")).toBe("Images");
    expect(formatWireLabel("PageArtifact + regions")).toBe("Image + Boxes");
    expect(formatWireLabel("TextLine[]")).toBe("Text");
    expect(formatWireLabel("TableStructure[]")).toBe("Tables");
    expect(formatWireLabel("DocumentArtifact")).toBe("Document");
    expect(formatWireLabel("JSON")).toBe("JSON");
  });

  it("returns unknown labels unchanged", () => {
    expect(formatWireLabel("unknown")).toBe("unknown");
    expect(formatWireLabel("CustomType")).toBe("CustomType");
  });
});

describe("formatArtifactKind", () => {
  it("maps runtime artifact kinds to human labels", () => {
    expect(formatArtifactKind("pages")).toBe("Images");
    expect(formatArtifactKind("page")).toBe("Image");
    expect(formatArtifactKind("regions")).toBe("Bounding boxes");
    expect(formatArtifactKind("lines")).toBe("Text");
    expect(formatArtifactKind("document")).toBe("Document");
  });

  it("returns unknown kinds unchanged", () => {
    expect(formatArtifactKind("custom")).toBe("custom");
  });
});
