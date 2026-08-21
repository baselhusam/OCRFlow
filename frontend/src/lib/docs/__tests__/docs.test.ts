import { describe, expect, it } from "vitest";

import { loadAllDocsPages } from "@/lib/docs/load";
import { flattenDocsNav, getAdjacentDocs } from "@/lib/docs/nav";
import { extractHeadings, flattenText, parseFrontmatter, slugify } from "@/lib/docs/parse";
import { searchDocs } from "@/lib/docs/search";
import type { DocsSearchEntry } from "@/lib/docs/types";

describe("docs parse", () => {
  it("slugifies headings without punctuation", () => {
    expect(slugify("GPU & accelerators")).toBe("gpu-accelerators");
    expect(slugify("`PageArtifact` output")).toBe("pageartifact-output");
  });

  it("parses frontmatter and remaining markdown", () => {
    const { data, content } = parseFrontmatter(
      "---\ntitle: Jobs\ndescription: Batch a pipeline\n---\n\n## Trace\nHello.",
    );
    expect(data).toEqual({ title: "Jobs", description: "Batch a pipeline" });
    expect(content).toBe("## Trace\nHello.");
  });

  it("extracts h2/h3 headings and ignores fenced code", () => {
    const headings = extractHeadings(
      "## Start\n```\n## Not a heading\n```\n### Nested\n",
    );
    expect(headings).toEqual([
      { id: "start", title: "Start", depth: 2 },
      { id: "nested", title: "Nested", depth: 3 },
    ]);
  });

  it("flattens markdown into searchable text", () => {
    expect(flattenText("See [Jobs](/documentation/jobs) and `make up`.")).toContain(
      "Jobs",
    );
  });
});

describe("docs nav", () => {
  it("keeps a unique slug for every page", () => {
    const slugs = flattenDocsNav().map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("returns previous and next pages in sidebar order", () => {
    const { previous, next } = getAdjacentDocs("quick-start");
    expect(previous?.slug).toBe("");
    expect(next?.slug).toBe("installation");
  });

  it("has a markdown file for every sidebar page", () => {
    const pages = loadAllDocsPages();
    expect(pages.map((page) => page.slug).sort()).toEqual(
      flattenDocsNav()
        .map((item) => item.slug)
        .sort(),
    );
    for (const page of pages) {
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.content.length).toBeGreaterThan(80);
      expect(page.headings.length).toBeGreaterThan(0);
    }
  });
});

describe("docs search", () => {
  const entries: DocsSearchEntry[] = [
    {
      slug: "jobs",
      href: "/documentation/jobs",
      title: "Jobs",
      description: "Batch a ready pipeline across documents.",
      section: "Concepts",
      headings: ["Create a job", "Cancel"],
      body: "Upload up to 50 PDF or image files and trace each document.",
    },
    {
      slug: "gpu",
      href: "/documentation/gpu",
      title: "GPU & accelerators",
      description: "Detect NVIDIA, AMD, or Apple GPUs.",
      section: "Get started",
      headings: ["make detect"],
      body: "Start OCR engines with CUDA, ROCm, or Metal.",
    },
  ];

  it("ranks title matches above body matches", () => {
    const hits = searchDocs("jobs", entries);
    expect(hits[0]?.slug).toBe("jobs");
    expect(hits[0]?.matchIn).toBe("title");
  });

  it("returns nothing for a one-character query", () => {
    expect(searchDocs("j", entries)).toEqual([]);
  });
});
