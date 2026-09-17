import { describe, expect, it } from "vitest";

import {
  buildGroupHandle,
  buildItemHandle,
  handleItemIds,
  listCollectionItems,
  parseSourceHandle,
  sliceOutputByHandle,
} from "@/lib/canvas/output-slice";
import type { NodeCachedOutput } from "@/lib/canvas/types";

const regions: NodeCachedOutput = {
  kind: "regions",
  raw: {
    page_index: 2,
    regions: [
      { id: "r1", label: "text", bbox: [0, 0, 0.2, 0.2], confidence: 0.9 },
      {
        id: "r2",
        label: "figure",
        docling_label: "SectionHeader",
        bbox: [0.2, 0.2, 0.5, 0.5],
      },
      { id: "r3", label: "table", bbox: [0.5, 0.5, 0.9, 0.9], confidence: 0.4 },
    ],
  },
  preview: { itemCount: 3 },
};

const pages: NodeCachedOutput = {
  kind: "pages",
  raw: {
    pages: [0, 1, 2].map((i) => ({
      page_index: i,
      page: { page_index: i, width: 10, height: 20, image_base64: `img${i}` },
    })),
  },
  preview: { pageCount: 3 },
};

describe("group handles", () => {
  it("round-trips a group and collapses singletons to items", () => {
    const handle = buildGroupHandle("region", ["r1", "r3"]);
    expect(parseSourceHandle(handle)).toEqual({
      scope: "group",
      itemKind: "region",
      itemIds: ["r1", "r3"],
    });
    expect(parseSourceHandle(buildGroupHandle("page", ["4"]))).toEqual({
      scope: "item",
      itemKind: "page",
      itemId: "4",
    });
    expect(handleItemIds(handle)).toEqual(["r1", "r3"]);
    expect(handleItemIds("output")).toBeNull();
  });

  it("encodes ids that contain the separator", () => {
    const handle = buildGroupHandle("line", ["a,b", "c"]);
    expect(parseSourceHandle(handle)).toEqual({
      scope: "group",
      itemKind: "line",
      itemIds: ["a,b", "c"],
    });
  });

  it("slices a group of regions keeping the kind", () => {
    const sliced = sliceOutputByHandle(
      regions,
      buildGroupHandle("region", ["r1", "r3"]),
    );
    expect(sliced?.kind).toBe("regions");
    expect(
      (sliced?.raw as { regions: Array<{ id: string }> }).regions.map(
        (r) => r.id,
      ),
    ).toEqual(["r1", "r3"]);
    expect(sliced?.preview?.itemCount).toBe(2);
  });

  it("slices pages: one → page, many → pages", () => {
    const one = sliceOutputByHandle(pages, buildItemHandle("page", "1"));
    expect(one?.kind).toBe("page");
    const many = sliceOutputByHandle(
      pages,
      buildGroupHandle("page", ["0", "2"]),
    );
    expect(many?.kind).toBe("pages");
    expect(
      (many?.raw as { pages: Array<{ page_index: number }> }).pages.map(
        (p) => p.page_index,
      ),
    ).toEqual([0, 2]);
    expect(many?.preview?.pageCount).toBe(2);
  });

  it("returns null when nothing matches", () => {
    expect(
      sliceOutputByHandle(regions, buildItemHandle("region", "nope")),
    ).toBeNull();
    expect(
      sliceOutputByHandle(regions, buildItemHandle("table", "r1")),
    ).toBeNull();
  });
});

describe("listCollectionItems", () => {
  it("describes regions with pretty labels, bbox, page and confidence", () => {
    const items = listCollectionItems(regions);
    expect(items.map((i) => i.label)).toEqual([
      "text",
      "section header",
      "table",
    ]);
    expect(items[0]).toMatchObject({
      itemKind: "region",
      id: "r1",
      handle: "item:region:r1",
      pageIndex: 2,
      confidence: 0.9,
      bbox: [0, 0, 0.2, 0.2],
    });
  });

  it("describes pages with their raster", () => {
    const items = listCollectionItems(pages);
    expect(items).toHaveLength(3);
    expect(items[1]).toMatchObject({
      itemKind: "page",
      id: "1",
      label: "Page 2",
      sublabel: "10×20",
      image: { base64: "img1", width: 10, height: 20 },
    });
  });

  it("describes formulas", () => {
    const items = listCollectionItems({
      kind: "formulas",
      raw: {
        formulas: [
          { id: "f1", latex: "x^2", inline: true, bbox: [0, 0, 1, 1] },
        ],
      },
    });
    expect(items[0]).toMatchObject({
      itemKind: "formula",
      text: "x^2",
      sublabel: "inline",
    });
  });
});

describe("page-qualified handles (mapped outputs)", () => {
  const mapped: NodeCachedOutput = {
    kind: "regions",
    raw: { page_index: 0, regions: [{ id: "r1", label: "p0" }] },
    mapped: [
      {
        page_index: 0,
        output: {
          kind: "regions",
          raw: { regions: [{ id: "r1", label: "p0" }] },
        },
      },
      {
        page_index: 3,
        output: {
          kind: "regions",
          raw: {
            regions: [
              { id: "r1", label: "p3" },
              { id: "r2", label: "p3" },
            ],
          },
        },
      },
    ],
  };

  it("parses and builds @page handles", () => {
    expect(buildItemHandle("region", "r1", 3)).toBe("item:region:r1@3");
    expect(parseSourceHandle("item:region:r1@3")).toEqual({
      scope: "item",
      itemKind: "region",
      itemId: "r1",
      pageIndex: 3,
    });
    expect(parseSourceHandle(buildGroupHandle("line", ["a", "b"], 2))).toEqual({
      scope: "group",
      itemKind: "line",
      itemIds: ["a", "b"],
      pageIndex: 2,
    });
    // pages never get a suffix
    expect(buildItemHandle("page", "4", 9)).toBe("item:page:4");
  });

  it("slices the addressed page of a mapped output", () => {
    const sliced = sliceOutputByHandle(mapped, "item:region:r1@3");
    expect(
      (sliced?.raw as { regions: Array<{ label: string }> }).regions[0].label,
    ).toBe("p3");
    const group = sliceOutputByHandle(mapped, "items:region:r1,r2@3");
    expect((group?.raw as { regions: unknown[] }).regions).toHaveLength(2);
    expect(sliceOutputByHandle(mapped, "item:region:r1@7")).toBeNull();
    // no page → current page
    expect(
      (
        sliceOutputByHandle(mapped, "item:region:r1")?.raw as {
          regions: Array<{ label: string }>;
        }
      ).regions[0].label,
    ).toBe("p0");
  });
});
