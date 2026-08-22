import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getGraphAssetNamespace,
  getPipelineAssetUrl,
  getProjectAssetUrl,
  uploadPipelineAsset,
} from "@/lib/api/assets";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asset API routing", () => {
  it("builds entity-specific preview URLs", () => {
    expect(getProjectAssetUrl("project-1", "asset-1")).toBe(
      "/api/projects/project-1/assets/asset-1",
    );
    expect(getPipelineAssetUrl("pipeline-1", "asset-1")).toBe(
      "/api/pipelines/pipeline-1/assets/asset-1",
    );
    expect(getGraphAssetNamespace({ kind: "project", id: "project-1" })).toBe(
      "project-1",
    );
    expect(getGraphAssetNamespace({ kind: "pipeline", id: "pipeline-1" })).toBe(
      "pipeline-pipeline-1",
    );
  });

  it("uploads pipeline test documents to the pipeline namespace", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          asset_id: "asset-1",
          filename: "invoice.pdf",
          mime_type: "application/pdf",
          size_bytes: 42,
          format: "pdf",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadPipelineAsset(
      "pipeline-1",
      new File(["invoice"], "invoice.pdf", { type: "application/pdf" }),
    );

    expect(result.asset_id).toBe("asset-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pipelines/pipeline-1/assets",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
