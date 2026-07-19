"use client";

import type { NodeCachedOutput } from "@/lib/canvas/types";
import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";
import { DocumentPreview } from "@/components/canvas/node-detail/previews/document-preview";
import { FigurePreview } from "@/components/canvas/node-detail/previews/figure-preview";
import { FormulaPreview } from "@/components/canvas/node-detail/previews/formula-preview";
import { LayoutPreview } from "@/components/canvas/node-detail/previews/layout-preview";
import { LinesPreview } from "@/components/canvas/node-detail/previews/lines-preview";
import { PagePreview } from "@/components/canvas/node-detail/previews/page-preview";
import { ReadingOrderPreview } from "@/components/canvas/node-detail/previews/reading-order-preview";
import { TablePreview } from "@/components/canvas/node-detail/previews/table-preview";
import {
  extractPageImage,
  extractPages,
  extractRegions,
  extractLines,
  type PageArtifactWire,
} from "@/lib/canvas/resolve-upstream";

function parseRegions(output: NodeCachedOutput | null): RegionWire[] {
  if (!output) return [];
  const raw = output.raw as { regions?: unknown[] };
  const list =
    raw.regions ??
    (output.kind === "regions" ? extractRegions(output) : []);
  return (list as unknown[]).filter((r): r is RegionWire => {
    const region = r as RegionWire;
    return Boolean(
      region?.id &&
        region?.label &&
        Array.isArray(region.bbox) &&
        region.bbox.length === 4,
    );
  });
}

type CategoryPreviewProps = {
  category: string;
  output: NodeCachedOutput | null;
  pages?: PageArtifactWire[];
  pageImageBase64?: string;
  selectedPageIndex?: number;
  onSelectPage?: (index: number) => void;
  isInput?: boolean;
};

export function CategoryPreview({
  category,
  output,
  pages = [],
  pageImageBase64,
  selectedPageIndex,
  onSelectPage,
  isInput = false,
}: CategoryPreviewProps) {
  const pageImg =
    pageImageBase64 ?? extractPageImage(output)?.image_base64 ?? undefined;

  if (!output && pages.length === 0) {
    return null;
  }

  if (output?.kind === "pages" || (pages.length > 0 && !output)) {
    const pageList =
      pages.length > 0
        ? pages
        : extractPages(output);
    const isSourceLoaderPreview = category === "page_loader";
    return (
      <PagePreview
        pages={pageList}
        selectedIndex={selectedPageIndex}
        onSelectPage={onSelectPage}
        scrollAllPages={isSourceLoaderPreview}
        collapsiblePagesPanel={isSourceLoaderPreview && pageList.length > 1}
        pagesPanelDefaultOpen={false}
      />
    );
  }

  if (output?.kind === "page") {
    const pageList = extractPages(output);
    const isSourceLoaderPreview = category === "page_loader";
    return (
      <PagePreview
        pages={pageList.length ? pageList : pages}
        selectedIndex={selectedPageIndex}
        onSelectPage={onSelectPage}
        scrollAllPages={isSourceLoaderPreview}
        collapsiblePagesPanel={isSourceLoaderPreview && pageList.length > 1}
        pagesPanelDefaultOpen={false}
      />
    );
  }

  if (
    category === "layout_detection" &&
    output?.kind === "regions"
  ) {
    const regions = parseRegions(output);
    if (regions.length) {
      return (
        <LayoutPreview
          regions={regions}
          pageImageBase64={pageImg}
          pageIndex={
            (output.raw as { page_index?: number }).page_index ?? 0
          }
        />
      );
    }
  }

  if (output?.kind === "lines") {
    const lines = (output.raw as { lines?: unknown[] }).lines ?? extractLines(output);
    return (
      <LinesPreview
        lines={lines as Array<{ id?: string; text?: string; confidence?: number; bbox?: number[] }>}
        pageImageBase64={pageImg}
        showText={category === "text_recognition" || isInput === false}
      />
    );
  }

  if (output?.kind === "reading_order") {
    const orderedIds =
      (output.raw as { reading_order?: { ordered_ids?: string[] } }).reading_order
        ?.ordered_ids ?? [];
    const regions = parseRegions(output);
    return (
      <ReadingOrderPreview
        regions={regions}
        orderedIds={orderedIds}
        pageImageBase64={pageImg}
      />
    );
  }

  if (output?.kind === "tables") {
    const tables = (output.raw as { tables?: unknown[] }).tables ?? [];
    return (
      <TablePreview
        tables={tables as Parameters<typeof TablePreview>[0]["tables"]}
        pageImageBase64={pageImg}
      />
    );
  }

  if (output?.kind === "formulas") {
    const formulas = (output.raw as { formulas?: unknown[] }).formulas ?? [];
    return (
      <FormulaPreview
        formulas={formulas as Parameters<typeof FormulaPreview>[0]["formulas"]}
        pageImageBase64={pageImg}
      />
    );
  }

  if (output?.kind === "figures") {
    const figures = (output.raw as { figures?: unknown[] }).figures ?? [];
    return (
      <FigurePreview
        figures={figures as Parameters<typeof FigurePreview>[0]["figures"]}
        pageImageBase64={pageImg}
      />
    );
  }

  if (output?.kind === "document") {
    const raw = output.raw as {
      markdown?: string;
      json?: unknown;
      pages?: PageArtifactWire[];
    };
    return (
      <DocumentPreview
        markdown={raw.markdown ?? output.preview?.markdownPreview}
        json={raw.json ?? output.preview?.jsonPreview}
        pages={raw.pages ?? extractPages(output)}
        pageCount={output.preview?.itemCount ?? output.preview?.pageCount}
      />
    );
  }

  if (output?.kind === "json") {
    return <DocumentPreview json={output.raw} />;
  }

  if (output?.kind === "regions") {
    const regions = parseRegions(output);
    if (regions.length) {
      return (
        <LayoutPreview
          regions={regions}
          pageImageBase64={pageImg}
        />
      );
    }
  }

  return null;
}
