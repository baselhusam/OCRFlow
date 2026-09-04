import type { NodeCachedOutput, OutputPreview, PipelineNodeData } from "@/lib/canvas/types";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { connectedNodeIds, getConnectedProtocol } from "@/lib/canvas/connected-node-meta";
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

function isUsablePageImage(
  page: InferenceContext["upstreamPages"][number]["page"] | unknown,
): page is NonNullable<InferenceContext["upstreamPages"][number]["page"]> {
  if (!page || typeof page !== "object") return false;
  const candidate = page as { image_base64?: unknown; image_url?: unknown };
  return (
    (typeof candidate.image_base64 === "string" &&
      candidate.image_base64.length > 0) ||
    (typeof candidate.image_url === "string" && candidate.image_url.length > 0)
  );
}

function extractPageImageFromCtx(ctx: InferenceContext) {
  if (isUsablePageImage(ctx.upstreamOutput?.preview?.pageImage)) {
    return ctx.upstreamOutput.preview.pageImage;
  }
  const page = ctx.upstreamPages[0]?.page;
  if (isUsablePageImage(page)) return page;
  if (ctx.upstreamOutput?.kind === "page") {
    const raw = ctx.upstreamOutput.raw as { page?: { page?: unknown } };
    const nested = raw.page?.page ?? raw.page;
    if (isUsablePageImage(nested)) return nested;
  }
  return null;
}

export function assetLoaderModelId(
  format: unknown,
): "loader/pdf" | "loader/image" {
  return String(format).toLowerCase() === "pdf" ? "loader/pdf" : "loader/image";
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

function textFromUpstream(output: NodeCachedOutput | null): string | null {
  if (!output || typeof output.raw !== "object" || output.raw === null) {
    return null;
  }
  const raw = output.raw as Record<string, unknown>;
  if (typeof raw.text === "string" && raw.text.trim()) return raw.text.trim();
  if (Array.isArray(raw.lines)) {
    const text = raw.lines
      .map((line) =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as { text?: unknown }).text === "string"
          ? (line as { text: string }).text.trim()
          : "",
      )
      .filter(Boolean)
      .join("\n");
    if (text) return text;
  }
  if (typeof raw.markdown === "string" && raw.markdown.trim()) {
    return raw.markdown.trim();
  }
  if (Array.isArray(raw.tables)) {
    const text = raw.tables
      .map((table) => {
        if (typeof table !== "object" || table === null) return "";
        const value = table as { html?: unknown; otsl?: unknown };
        return typeof value.html === "string"
          ? value.html
          : typeof value.otsl === "string"
            ? value.otsl
            : "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (text) return text;
  }
  const structured = raw.data ?? raw.json;
  if (structured && typeof structured === "object") {
    return JSON.stringify(structured);
  }
  return null;
}

function ollamaOptions(
  params: Record<string, string | boolean | number>,
  defaultModel: string,
) {
  return {
    model: String(params.model ?? defaultModel),
    temperature: Number(params.temperature ?? 0),
    max_tokens: Number(params.max_tokens ?? 1024),
    ...(typeof params.system_prompt === "string" && params.system_prompt.trim()
      ? { system_prompt: params.system_prompt }
      : {}),
  };
}

function parseConfiguredJsonSchema(
  params: Record<string, string | boolean | number>,
): Record<string, unknown> | null {
  if (typeof params.json_schema !== "string" || !params.json_schema.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(params.json_schema);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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
  {
    id: "paddle/doclayout-s",
    path: "/api/v1/models/paddle/doclayout-s",
    opts: ["confidence_threshold"],
    kind: "regions",
  },
  {
    id: "paddle/ocr-v6-small",
    path: "/api/v1/models/paddle/ocr-v6-small",
    opts: ["confidence_threshold"],
    kind: "lines",
  },
];

for (const { id, path, opts, kind } of pageModels) {
  REGISTRY[id] = pageOnlyModel(path, opts ?? [], kind ?? "regions");
}

REGISTRY["paddle/pp-structure"] = {
  apiPath: "/api/v1/models/paddle/pp-structure",
  buildPayload(ctx) {
    const page = extractPageImageFromCtx(ctx);
    if (!page) return null;
    return { page };
  },
  extractOutput(_id, response) {
    const regions = (response.regions as unknown[]) ?? [];
    const lines = (response.lines as Array<{ text?: string }>) ?? [];
    const tables = (response.tables as unknown[]) ?? [];
    return {
      kind: "regions",
      raw: response,
      // Full document parse on one page: regions + text lines + tables.
      preview: {
        itemCount: regions.length,
        pageCount: tables.length,
        textSnippets: lines.map((l) => l.text).filter(Boolean) as string[],
      },
    };
  },
};

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
    if (!page) return null;
    const regions =
      (ctx.upstreamOutput?.raw as { regions?: RegionWire[] })?.regions ?? [];
    const formulaRegions = regions.filter(
      (region) => region.label === "formula" || region.label === "code",
    );
    const source = formulaRegions.length ? formulaRegions : regions;
    return {
      page,
      formulas: source
        .filter((region) => Array.isArray(region.bbox) && region.bbox.length === 4)
        .map((region, index) => ({
          id: region.id || `formula-${index + 1}`,
          bbox: region.bbox,
        })),
    };
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

for (const id of ["ollama/text-prompt", "ollama/structured-extract"]) {
  const structured = id === "ollama/structured-extract";
  REGISTRY[id] = {
    apiPath: `/api/v1/models/${id}`,
    buildPayload(ctx) {
      const text =
        textFromUpstream(ctx.upstreamOutput) ||
        (typeof ctx.data.params.text === "string"
          ? ctx.data.params.text.trim()
          : "");
      if (!text) return null;
      const payload: Record<string, unknown> = {
        text,
        prompt: String(
          ctx.data.params.prompt ??
            (structured
              ? "Extract the requested fields from the input."
              : "Summarize the input accurately and concisely."),
        ),
        options: ollamaOptions(ctx.data.params, "qwen3:0.6b"),
      };
      if (structured) {
        const schema = parseConfiguredJsonSchema(ctx.data.params);
        if (!schema) return null;
        payload.json_schema = schema;
      }
      return payload;
    },
    extractOutput(_modelId, response) {
      if (structured) {
        const data =
          typeof response.data === "object" && response.data !== null
            ? response.data
            : {};
        return {
          kind: "json",
          raw: response,
          preview: { jsonPreview: data },
        };
      }
      const text = typeof response.text === "string" ? response.text : "";
      return {
        kind: "text",
        raw: response,
        preview: {
          itemCount: text ? 1 : 0,
          textSnippets: text ? [text] : [],
        },
      };
    },
  };
}

for (const id of [
  "ollama/vision-prompt",
  "ollama/vision-structured-extract",
]) {
  const structured = id === "ollama/vision-structured-extract";
  REGISTRY[id] = {
    apiPath: `/api/v1/models/${id}`,
    buildPayload(ctx) {
      const page = extractPageImageFromCtx(ctx);
      if (!page) return null;
      const payload: Record<string, unknown> = {
        page,
        prompt: String(
          ctx.data.params.prompt ??
            (structured
              ? "Extract the requested fields from this document page."
              : "Describe this document page, including charts and tables."),
        ),
        options: ollamaOptions(ctx.data.params, "qwen3.5:0.8b"),
      };
      if (structured) {
        const schema = parseConfiguredJsonSchema(ctx.data.params);
        if (!schema) return null;
        payload.json_schema = schema;
      }
      return payload;
    },
    extractOutput(_modelId, response) {
      if (structured) {
        const data =
          typeof response.data === "object" && response.data !== null
            ? response.data
            : {};
        return {
          kind: "json",
          raw: response,
          preview: { jsonPreview: data },
        };
      }
      const text = typeof response.text === "string" ? response.text : "";
      return {
        kind: "text",
        raw: response,
        preview: {
          itemCount: text ? 1 : 0,
          textSnippets: text ? [text] : [],
        },
      };
    },
  };
}

for (const id of [
  "liquid/vision-prompt",
  "liquid/vision-structured-extract",
]) {
  const structured = id === "liquid/vision-structured-extract";
  REGISTRY[id] = {
    apiPath: `/api/v1/models/${id}`,
    buildPayload(ctx) {
      const page = extractPageImageFromCtx(ctx);
      if (!page) return null;
      const payload: Record<string, unknown> = {
        page,
        prompt: String(
          ctx.data.params.prompt ??
            (structured
              ? "Extract the requested fields from this document page."
              : "Read this document page accurately, preserving meaningful structure."),
        ),
        options: {
          model: "LiquidAI/LFM2.5-VL-1.6B",
          temperature: Number(ctx.data.params.temperature ?? 0.1),
          max_tokens: Number(ctx.data.params.max_tokens ?? 1024),
          ...(typeof ctx.data.params.system_prompt === "string" &&
          ctx.data.params.system_prompt.trim()
            ? { system_prompt: ctx.data.params.system_prompt }
            : {}),
        },
      };
      if (structured) {
        const schema = parseConfiguredJsonSchema(ctx.data.params);
        if (!schema) return null;
        payload.json_schema = schema;
      }
      return payload;
    },
    extractOutput(_modelId, response) {
      if (structured) {
        const data =
          typeof response.data === "object" && response.data !== null
            ? response.data
            : {};
        return { kind: "json", raw: response, preview: { jsonPreview: data } };
      }
      const text = typeof response.text === "string" ? response.text : "";
      return {
        kind: "text",
        raw: response,
        preview: { itemCount: text ? 1 : 0, textSnippets: text ? [text] : [] },
      };
    },
  };
}

for (const id of ["llm/text-prompt", "llm/structured-extract", "vlm/vision-prompt", "vlm/vision-structured-extract", ...connectedNodeIds()]) {
  const vision = id.startsWith("vlm/");
  const structured = id.includes("structured-extract");
  REGISTRY[id] = {
    apiPath: `/api/v1/models/connected/${vision ? (structured ? "vision-structured-extract" : "vision-prompt") : (structured ? "structured-extract" : "text-prompt")}`,
    buildPayload(ctx) {
      const connection_id = String(ctx.data.params.connection_id ?? "").trim();
      const model = String(ctx.data.params.model ?? "").trim();
      if (!connection_id || !model) return null;
      const provider_protocol = getConnectedProtocol(id);
      const options = { connection_id, model, temperature: Number(ctx.data.params.temperature ?? 0), max_tokens: Number(ctx.data.params.max_tokens ?? 1024), ...(provider_protocol ? { provider_protocol } : {}), ...(typeof ctx.data.params.system_prompt === "string" && ctx.data.params.system_prompt.trim() ? {system_prompt:ctx.data.params.system_prompt} : {}) };
      const payload: Record<string, unknown> = { prompt: String(ctx.data.params.prompt ?? ""), options };
      if (vision) { const page=extractPageImageFromCtx(ctx); if(!page)return null; payload.page=page; }
      else { const text=textFromUpstream(ctx.upstreamOutput) ?? (typeof ctx.data.params.text === "string" ? ctx.data.params.text.trim() : ""); if(!text)return null; payload.text=text; }
      if (structured) { const schema=parseConfiguredJsonSchema(ctx.data.params); if(!schema)return null; payload.json_schema=schema; }
      return payload;
    },
    extractOutput(_id,response) { if(structured){const data=typeof response.data === "object" && response.data !== null ? response.data : {};return {kind:"json",raw:response,preview:{jsonPreview:data}};} const text=typeof response.text === "string"?response.text:"";return {kind:"text",raw:response,preview:{itemCount:text?1:0,textSnippets:text?[text]:[]}}; },
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
