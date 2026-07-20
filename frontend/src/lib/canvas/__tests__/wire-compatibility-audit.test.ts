import { describe, expect, it } from "vitest";

import {
  AUDIT_CATEGORIES,
  AUDIT_DONE_MODELS,
  EXPECTED_DOWNSTREAM,
  EXPECTED_UPSTREAM,
  SPAWN_ONLY_UPSTREAM_SOURCES,
} from "@/lib/canvas/__tests__/fixtures/audit-done-models";
import { evaluatePipelineConnection } from "@/lib/canvas/connection-validation";
import { getCompatibleDownstreamModels } from "@/lib/canvas/compatible-downstream-models";
import { getCompatibleUpstreamModels } from "@/lib/canvas/compatible-upstream-models";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import { PARENT_SELECT_PAGE_PARAM } from "@/lib/canvas/page-branch-meta";
import {
  areWireKindsCompatible,
  getModelWireKinds,
  getNodeWireKinds,
  MODEL_WIRE_KINDS,
} from "@/lib/canvas/wire-types";
import type { Node } from "@xyflow/react";
import type { PipelineNodeData } from "@/lib/canvas/types";

function buildNode(
  entry: (typeof AUDIT_DONE_MODELS)[number],
  partial?: Partial<PipelineNodeData>,
): Node<PipelineNodeData> {
  const categoryLabel =
    AUDIT_CATEGORIES.find((c) => c.id === entry.category)?.display_name ??
    entry.category;
  return {
    id: entry.id,
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: {
      ...buildPipelineNodeData(entry, categoryLabel),
      ...partial,
    },
  };
}

function compatibleIds(
  targetId: string,
  direction: "upstream" | "downstream",
): string[] {
  const entry = AUDIT_DONE_MODELS.find((m) => m.id === targetId)!;
  const categoryLabel =
    AUDIT_CATEGORIES.find((c) => c.id === entry.category)?.display_name ??
    entry.category;
  const data = buildPipelineNodeData(entry, categoryLabel);

  const list =
    direction === "upstream"
      ? getCompatibleUpstreamModels(data, AUDIT_DONE_MODELS, AUDIT_CATEGORIES)
      : getCompatibleDownstreamModels(data, AUDIT_DONE_MODELS, AUDIT_CATEGORIES);

  return list.map((item) => item.model.id).sort();
}

describe("wire compatibility audit — all done models", () => {
  it("keeps display wire labels aligned with MODEL_WIRE_KINDS", () => {
    const mismatches: string[] = [];

    for (const entry of AUDIT_DONE_MODELS) {
      const kinds = MODEL_WIRE_KINDS[entry.id];
      if (!kinds) continue;

      const categoryLabel =
        AUDIT_CATEGORIES.find((c) => c.id === entry.category)?.display_name ??
        entry.category;
      const data = buildPipelineNodeData(entry, categoryLabel);
      const resolved = getNodeWireKinds(data);

      if (resolved.input !== kinds.input || resolved.output !== kinds.output) {
        mismatches.push(
          `${entry.id}: node kinds ${resolved.input}→${resolved.output} != catalog ${kinds.input}→${kinds.output}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("matches expected upstream recommendations for every done model", () => {
    const failures: string[] = [];

    for (const entry of AUDIT_DONE_MODELS) {
      const expected = [...(EXPECTED_UPSTREAM[entry.id] ?? [])].sort();
      const actual = compatibleIds(entry.id, "upstream");
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        failures.push(
          `${entry.id}\n  expected: ${expected.join(", ") || "(none)"}\n  actual:   ${actual.join(", ") || "(none)"}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it("matches expected downstream recommendations for every done model", () => {
    const failures: string[] = [];

    for (const entry of AUDIT_DONE_MODELS) {
      const expected = [...(EXPECTED_DOWNSTREAM[entry.id] ?? [])].sort();
      const actual = compatibleIds(entry.id, "downstream");
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        failures.push(
          `${entry.id}\n  expected: ${expected.join(", ") || "(none)"}\n  actual:   ${actual.join(", ") || "(none)"}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it("is symmetric: upstream/downstream lists agree with evaluatePipelineConnection", () => {
    const failures: string[] = [];

    for (const target of AUDIT_DONE_MODELS) {
      const upstreamIds = compatibleIds(target.id, "upstream");
      for (const source of AUDIT_DONE_MODELS) {
        if (source.id === target.id) continue;
        const sourceNode = buildNode(source);
        const targetNode = buildNode(target);
        const allowed = evaluatePipelineConnection(sourceNode, targetNode, "output");
        const listed = upstreamIds.includes(source.id);
        if (SPAWN_ONLY_UPSTREAM_SOURCES.has(source.id)) {
          if (allowed && listed) {
            failures.push(
              `${source.id} → ${target.id}: spawn-only source should not appear in recommendations`,
            );
          }
          continue;
        }
        if (allowed !== listed) {
          failures.push(
            `${source.id} → ${target.id}: connection=${allowed} listed=${listed}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("documents valid end-to-end pipeline chains", () => {
    const chains: Array<{ name: string; pairs: [string, string][] }> = [
      {
        name: "loader → layout → text detection → recognition",
        pairs: [
          ["loader/pdf", "docling/layout-heron"],
          ["docling/layout-heron", "surya/text-detection"],
          ["surya/text-detection", "surya/text-recognition"],
        ],
      },
      {
        name: "loader → page-at → layout",
        pairs: [
          ["loader/pdf", "loader/page-at"],
          ["loader/page-at", "docling/layout-heron"],
        ],
      },
      {
        name: "loader → docling convert-pipeline",
        pairs: [["loader/pdf", "docling/convert-pipeline"]],
      },
      {
        name: "loader → ocr-auto → recognition",
        pairs: [
          ["loader/pdf", "docling/ocr-auto"],
          ["docling/ocr-auto", "surya/text-recognition"],
        ],
      },
      {
        name: "layout → classifier → caption",
        pairs: [
          ["surya/layout", "docling/picture-classifier-v2.5"],
          [
            "docling/picture-classifier-v2.5",
            "docling/picture-description-smolvlm",
          ],
        ],
      },
    ];

    for (const chain of chains) {
      for (const [sourceId, targetId] of chain.pairs) {
        const source = AUDIT_DONE_MODELS.find((m) => m.id === sourceId)!;
        const target = AUDIT_DONE_MODELS.find((m) => m.id === targetId)!;
        expect(
          evaluatePipelineConnection(buildNode(source), buildNode(target), "output"),
          `${chain.name}: ${sourceId} → ${targetId}`,
        ).toBe(true);
      }
    }
  });

  it("rejects invalid cross-type connections", () => {
    const invalidPairs: [string, string][] = [
      ["docling/layout-heron", "docling/ocr-auto"],
      ["surya/text-recognition", "surya/text-detection"],
      ["docling/picture-description-smolvlm", "docling/layout-heron"],
      ["loader/pdf", "loader/page-branch"],
      ["docling/vlm-granite-docling", "docling/layout-heron"],
    ];

    for (const [sourceId, targetId] of invalidPairs) {
      const source = AUDIT_DONE_MODELS.find((m) => m.id === sourceId)!;
      const target = AUDIT_DONE_MODELS.find((m) => m.id === targetId)!;
      expect(
        evaluatePipelineConnection(buildNode(source), buildNode(target), "output"),
        `${sourceId} → ${targetId} should be rejected`,
      ).toBe(false);
    }
  });

  it("blocks page-branch upstream when parent is already bound", () => {
    const branch = buildNode(
      AUDIT_DONE_MODELS.find((m) => m.id === "loader/page-branch")!,
      {
        params: { page_index: 0, [PARENT_SELECT_PAGE_PARAM]: "anchor-1" },
      },
    );
    const pageAt = buildNode(
      AUDIT_DONE_MODELS.find((m) => m.id === "loader/page-at")!,
    );

    expect(evaluatePipelineConnection(pageAt, branch, "output")).toBe(false);
  });

  it("validates MODEL_WIRE_KINDS pairs against the compatibility matrix", () => {
    const failures: string[] = [];

    for (const [modelId, kinds] of Object.entries(MODEL_WIRE_KINDS)) {
      if (kinds.input !== "file" && kinds.input !== "none") {
        const hasProducer = Object.values(MODEL_WIRE_KINDS).some((other) =>
          areWireKindsCompatible(other.output, kinds.input),
        );
        if (!hasProducer && kinds.input !== "document_input") {
          failures.push(`${modelId}: no catalog producer for input ${kinds.input}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
