import { describe, expect, it } from "vitest";

import { derivePipelineBoundaryIO } from "@/lib/canvas/pipeline-boundary";
import {
  PIPELINE_TEMPLATES,
  buildModelChain,
  getTemplateBySlug,
} from "@/lib/templates/catalog";
import { templateAddLoginPath } from "@/lib/templates/add";

describe("pipeline templates", () => {
  it("includes a featured invoice template", () => {
    const invoice = getTemplateBySlug("invoice-extraction");
    expect(invoice).toBeDefined();
    expect(invoice?.featured).toBe(true);
    expect(invoice?.fields.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "vendor",
        "invoice_number",
        "currency",
        "total",
        "line_items",
      ]),
    );
  });

  it("exposes several distinct task templates", () => {
    expect(PIPELINE_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    const slugs = PIPELINE_TEMPLATES.map((template) => template.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("builds graphs that pass pipeline boundary validation", () => {
    for (const template of PIPELINE_TEMPLATES) {
      const boundary = derivePipelineBoundaryIO(
        template.graph.nodes,
        template.graph.edges,
      );
      expect(boundary.valid, `${template.slug}: ${boundary.errors.join(", ")}`).toBe(
        true,
      );
      expect(template.graph.nodes.length).toBeGreaterThanOrEqual(2);
      expect(template.description.length).toBeLessThanOrEqual(1024);
      expect(template.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("does not embed file loaders in reusable graphs", () => {
    for (const template of PIPELINE_TEMPLATES) {
      expect(
        template.graph.nodes.every(
          (node) =>
            node.modelId !== "loader/pdf" && node.modelId !== "loader/image",
        ),
      ).toBe(true);
    }
  });

  it("keeps chain helper output connected left-to-right", () => {
    const graph = buildModelChain([
      "docling/layout-heron",
      "surya/text-detection",
      "surya/text-recognition",
    ]);
    expect(graph.nodes.map((node) => node.modelId)).toEqual([
      "docling/layout-heron",
      "surya/text-detection",
      "surya/text-recognition",
    ]);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0]?.source).toBe(graph.nodes[0]?.id);
    expect(graph.edges[0]?.target).toBe(graph.nodes[1]?.id);
  });
});

describe("template add login redirect", () => {
  it("sends users back to the template with add=1 after auth", () => {
    expect(templateAddLoginPath("invoice-extraction")).toBe(
      "/login?next=%2Ftemplates%2Finvoice-extraction%3Fadd%3D1",
    );
  });
});
