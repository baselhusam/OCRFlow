import type { NodeCachedOutput, OutputPreview, PipelineNodeData } from "@/lib/canvas/types";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { parseLanguageCodes } from "@/lib/canvas/node-param-schema";
import {
  regionsToFigures,
  regionsToTableInputs,
  type RegionWire,
} from "@/lib/canvas/artifact-adapters";

export type InferenceContext = {
  projectId: string;
  data: PipelineNodeData;
  upstreamPages: import("@/lib/canvas/resolve-upstream").PageArtifactWire[];
  upstreamOutput: NodeCachedOutput | null;
  upstreamData?: PipelineNodeData | null;
  upstreamAssetId?: string | null;
};

export type ModelInferenceDef = {
  apiPath: string;
  buildPayload: (ctx: InferenceContext) => Record<string, unknown> | null;
  extractOutput: (
    modelId: string,
    response: Record<string, unknown>,
  ) => NodeCachedOutput;
};

function pageFromArtifact(
  artifact: import("@/lib/canvas/resolve-upstream").PageArtifactWire | undefined,
) {
  if (!artifact?.page) return null;
  return artifact.page;
}

function optionsFromParams(
  params: Record<string, string | boolean | number>,
  keys: string[],
): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  for (const key of keys) {
    if (params[key] !== undefined) opts[key] = params[key];
  }
  return opts;
}

function figuresFromUpstream(ctx: InferenceContext) {
  if (ctx.upstreamOutput?.kind === "figures") {
    return (ctx.upstreamOutput.raw as { figures?: unknown[] }).figures ?? [];
  }
  const regions =
    (ctx.upstreamOutput?.raw as { regions?: RegionWire[] })?.regions ?? [];
  return regionsToFigures(regions);
}

function tablesFromUpstream(ctx: InferenceContext) {
  if (ctx.upstreamOutput?.kind === "tables") {
    return (ctx.upstreamOutput.raw as { tables?: unknown[] }).tables ?? [];
  }
  const regions =
    (ctx.upstreamOutput?.raw as { regions?: RegionWire[] })?.regions ?? [];
  return regionsToTableInputs(regions);
}

function extractPageImageFromCtx(ctx: InferenceContext) {
  if (ctx.upstreamOutput?.preview?.pageImage) {
    return ctx.upstreamOutput.preview.pageImage;
  }
  const page = ctx.upstreamPages[0]?.page;
  if (page) return page;
  if (ctx.upstreamOutput?.kind === "page") {
    const raw = ctx.upstreamOutput.raw as { page?: { page?: unknown } };
    return raw.page?.page ?? raw.page;
  }
  return null;
}

function resolveDocumentAsset(
  ctx: InferenceContext,
): { assetId: string; format: string } | null {
  const localAssetId = ctx.data.params.assetId as string | undefined;
  if (localAssetId) {
    return {
      assetId: localAssetId,
      format: (ctx.data.params.format as string) ?? "pdf",
    };
  }

  const upstreamAssetId =
    ctx.upstreamAssetId ??
    (typeof ctx.upstreamData?.params.assetId === "string"
      ? ctx.upstreamData.params.assetId
      : undefined);
  if (!upstreamAssetId) return null;

  const upstreamFormat = ctx.upstreamData?.params.format;
  return {
    assetId: upstreamAssetId,
    format:
      typeof upstreamFormat === "string"
        ? upstreamFormat
        : ((ctx.data.params.format as string) ?? "pdf"),
  };
}

const REGISTRY: Record<string, ModelInferenceDef> = {
  "loader/pdf": {
    apiPath: "/api/v1/models/loader/pdf",
    buildPayload(ctx) {
      const assetId = ctx.data.params.assetId as string | undefined;
      if (!assetId) return null;
      return {
        document: { source: `asset:${assetId}`, format: "pdf" },
        options: {
          project_id: ctx.projectId,
          dpi: Number(ctx.data.params.dpi ?? 200),
          max_pages: Number(ctx.data.params.max_pages ?? 50),
        },
      };
    },
    extractOutput(_id, response) {
      const pages = (response.pages as unknown[]) ?? [];
      const first = (pages[0] as { page?: OutputPreview["pageImage"] })?.page;
      return {
        kind: "pages" as const,
        raw: response,
        preview: {
          pageCount: pages.length,
          pageImage: first,
          thumbnailBase64: first?.image_base64,
        },
      };
    },
  },
  "loader/image": {
    apiPath: "/api/v1/models/loader/image",
    buildPayload(ctx) {
      const assetId = ctx.data.params.assetId as string | undefined;
      if (!assetId) return null;
      return {
        document: {
          source: `asset:${assetId}`,
          format: ctx.data.params.format ?? "image",
        },
        options: { project_id: ctx.projectId },
      };
    },
    extractOutput(_id, response) {
      const pages = (response.pages as unknown[]) ?? [];
      const first = (pages[0] as { page?: OutputPreview["pageImage"] })?.page;
      return {
        kind: "pages" as const,
        raw: response,
        preview: {
          pageCount: pages.length,
          pageImage: first,
          thumbnailBase64: first?.image_base64,
        },
      };
    },
  },
  "loader/page-at": {
    apiPath: "/api/v1/models/loader/page-at",
    buildPayload(ctx) {
      if (!ctx.upstreamPages.length) return null;
      return {
        pages: ctx.upstreamPages,
        options: { page_index: Number(ctx.data.params.page_index ?? 0) },
      };
    },
    extractOutput(_id, response) {
      const page = (response.page as { page?: OutputPreview["pageImage"] }) ?? {};
      const img = page.page;
      return {
        kind: "page" as const,
        raw: response,
        preview: {
          pageCount: 1,
          pageImage: img,
          thumbnailBase64: img?.image_base64,
        },
      };
    },
  },
};

function pageOnlyModel(
  apiPath: string,
  optionsKeys: string[] = [],
  outputKind: "regions" | "lines" | "tables" = "regions",
): ModelInferenceDef {
  return {
    apiPath,
    buildPayload(ctx) {
      const page = extractPageImageFromCtx(ctx);
      if (!page) return null;
      const payload: Record<string, unknown> = { page };
      const regions = (ctx.upstreamOutput?.raw as { regions?: unknown[] })?.regions;
      if (regions?.length) payload.regions = regions;
      const opts = optionsFromParams(ctx.data.params, optionsKeys);
      if (Object.keys(opts).length) payload.options = opts;
      return payload;
    },
    extractOutput(_modelId, response) {
      const regions = (response.regions as unknown[]) ?? [];
      const lines = (response.lines as unknown[]) ?? [];
      const tables = (response.tables as unknown[]) ?? [];
      if (outputKind === "lines" || lines.length) {
        const snippets = (lines as Array<{ text?: string }>)
          .map((l) => l.text)
          .filter(Boolean) as string[];
        return {
          kind: "lines",
          raw: response,
          preview: {
            itemCount: lines.length,
            textSnippets: snippets,
          },
        };
      }
      if (outputKind === "tables" || tables.length) {
        return {
          kind: "tables",
          raw: response,
          preview: { itemCount: tables.length },
        };
      }
      return {
        kind: "regions",
        raw: response,
        preview: { itemCount: regions.length },
      };
    },
  };
}

const pageModels: Array<{
  id: string;
  path: string;
  opts?: string[];
  kind?: "regions" | "lines" | "tables";
}> = [
  { id: "surya/layout", path: "/api/v1/models/surya/layout", opts: ["confidence_threshold"], kind: "regions" },
  {
    id: "docling/layout-heron",
    path: "/api/v1/models/docling/layout-heron",
    opts: ["keep_empty_clusters", "skip_cell_assignment"],
    kind: "regions",
  },
  { id: "surya/text-detection", path: "/api/v1/models/surya/text-detection", kind: "lines" },
  { id: "surya/table-recognition", path: "/api/v1/models/surya/table-recognition", kind: "tables" },
];

for (const { id, path, opts, kind } of pageModels) {
  REGISTRY[id] = pageOnlyModel(path, opts ?? [], kind ?? "regions");
}

REGISTRY["surya/reading-order"] = {
  apiPath: "/api/v1/models/surya/reading-order",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const regions = (ctx.upstreamOutput?.raw as { regions?: unknown[] })?.regions ?? [];
    if (!page || !regions.length) return null;
    return { page, regions };
  },
  extractOutput(_id, response) {
    const regions = (response.regions as unknown[]) ?? [];
    return {
      kind: "reading_order",
      raw: response,
      preview: {
        itemCount:
          ((response.reading_order as { ordered_ids?: string[] })?.ordered_ids
            ?.length ?? regions.length),
      },
    };
  },
};

REGISTRY["surya/text-recognition"] = {
  apiPath: "/api/v1/models/surya/text-recognition",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const lines = (ctx.upstreamOutput?.raw as { lines?: unknown[] })?.lines ?? [];
    if (!page || !lines.length) return null;
    return {
      page,
      lines,
      languages: parseLanguageCodes(ctx.data.params.langs, "en"),
      options: { confidence_threshold: Number(ctx.data.params.confidence_threshold ?? 0.5) },
    };
  },
  extractOutput(_id, response) {
    const lines = (response.lines as Array<{ text?: string }>) ?? [];
    return {
      kind: "lines",
      raw: response,
      preview: {
        itemCount: lines.length,
        textSnippets: lines.map((l) => l.text).filter(Boolean) as string[],
      },
    };
  },
};

REGISTRY["docling/ocr-auto"] = {
  apiPath: "/api/v1/models/docling/ocr-auto",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    if (!page) return null;
    const rawLang =
      ctx.data.params.langs ?? ctx.data.params.languages ?? "eng";
    const payload: Record<string, unknown> = {
      page,
      languages: parseLanguageCodes(rawLang, "eng"),
      options: {
        confidence_threshold: Number(ctx.data.params.confidence_threshold ?? 0.5),
      },
    };
    const regions = (ctx.upstreamOutput?.raw as { regions?: unknown[] })?.regions;
    if (regions?.length) payload.regions = regions;
    const lines = (ctx.upstreamOutput?.raw as { lines?: unknown[] })?.lines;
    if (lines?.length) payload.lines = lines;
    return payload;
  },
  extractOutput(_id, response) {
    const lines = (response.lines as Array<{ text?: string }>) ?? [];
    return {
      kind: "lines",
      raw: response,
      preview: {
        itemCount: lines.length,
        textSnippets: lines.map((l) => l.text).filter(Boolean) as string[],
      },
    };
  },
};

REGISTRY["docling/tableformer-accurate"] = {
  apiPath: "/api/v1/models/docling/tableformer-accurate",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const tables = tablesFromUpstream(ctx);
    if (!page) return null;
    return { page, tables };
  },
  extractOutput(_id, response) {
    const tables = (response.tables as unknown[]) ?? [];
    return { kind: "tables", raw: response, preview: { itemCount: tables.length } };
  },
};

REGISTRY["docling/picture-classifier-v2.5"] = {
  apiPath: "/api/v1/models/docling/picture-classifier-v2.5",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const figures = figuresFromUpstream(ctx);
    if (!page) return null;
    return { page, figures };
  },
  extractOutput(_id, response) {
    const figures = (response.figures as unknown[]) ?? [];
    return { kind: "figures", raw: response, preview: { itemCount: figures.length } };
  },
};

REGISTRY["docling/picture-description-smolvlm"] = {
  apiPath: "/api/v1/models/docling/picture-description-smolvlm",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const figures = figuresFromUpstream(ctx);
    if (!page || !figures.length) return null;
    return {
      page,
      figures,
      options: { max_tokens: Number(ctx.data.params.max_tokens ?? 256) },
    };
  },
  extractOutput(_id, response) {
    const lines = (response.lines as Array<{ text?: string | null }>) ?? [];
    return {
      kind: "lines",
      raw: response,
      preview: {
        itemCount: lines.length,
        textSnippets: lines
          .map((line) => line.text)
          .filter((text): text is string => Boolean(text?.trim())),
      },
    };
  },
};

REGISTRY["docling/code-formula-v2"] = {
  apiPath: "/api/v1/models/docling/code-formula-v2",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const regions = (ctx.upstreamOutput?.raw as { regions?: unknown[] })?.regions ?? [];
    if (!page) return null;
    return { page, regions };
  },
  extractOutput(_id, response) {
    const formulas = (response.formulas as Array<{ latex?: string }>) ?? [];
    return {
      kind: "formulas",
      raw: response,
      preview: {
        itemCount: formulas.length,
        textSnippets: formulas.map((f) => f.latex).filter(Boolean) as string[],
      },
    };
  },
};

REGISTRY["surya/latex-ocr"] = {
  apiPath: "/api/v1/models/surya/latex-ocr",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    const regions =
      (ctx.upstreamOutput?.raw as { regions?: unknown[] })?.regions ?? [];
    if (!page || !regions.length) return null;
    return { page, regions };
  },
  extractOutput(_id, response) {
    const formulas = (response.formulas as unknown[]) ?? [];
    return { kind: "formulas", raw: response, preview: { itemCount: formulas.length } };
  },
};

for (const id of ["docling/vlm-granite-docling", "docling/convert-pipeline"]) {
  const path =
    id === "docling/vlm-granite-docling"
      ? "/api/v1/models/docling/vlm-granite-docling"
      : "/api/v1/models/docling/convert-pipeline";
  REGISTRY[id] = {
    apiPath: path,
    buildPayload(ctx) {
      const resolved = resolveDocumentAsset(ctx);
      if (!resolved) return null;
      const optionKeys =
        id === "docling/vlm-granite-docling"
          ? ["preset", "engine", "export"]
          : [
              "layout_model",
              "ocr_engine",
              "tableformer_mode",
              "enrich_pictures",
              "enrich_formulas",
            ];
      return {
        document: { source: `asset:${resolved.assetId}`, format: resolved.format },
        options: {
          project_id: ctx.projectId,
          ...optionsFromParams(ctx.data.params, optionKeys),
        },
      };
    },
    extractOutput(_id, response) {
      const markdown =
        typeof response.markdown === "string" ? response.markdown : undefined;
      const json = response.json ?? response.document;
      const pages = (response.pages as unknown[]) ?? [];
      return {
        kind: "document",
        raw: response,
        preview: {
          itemCount: pages.length,
          pageCount: pages.length,
          markdownPreview: markdown,
          jsonPreview: json,
        },
      };
    },
  };
}

export function getModelInferenceDef(
  modelId: string,
): ModelInferenceDef | null {
  return REGISTRY[modelId] ?? null;
}

export function modelIdToProxyPath(modelId: string): string {
  const [provider, ...rest] = modelId.split("/");
  return `${provider}/${rest.join("/")}`;
}

export function buildInferencePayload(
  modelId: string,
  ctx: InferenceContext,
): Record<string, unknown> | null {
  const def = getModelInferenceDef(modelId);
  if (!def) return null;
  return def.buildPayload(ctx);
}

export function extractInferenceOutput(
  modelId: string,
  response: Record<string, unknown>,
): NodeCachedOutput {
  const def = getModelInferenceDef(modelId);
  if (!def) {
    return { kind: "json", raw: response };
  }
  return def.extractOutput(modelId, response);
}
