export type OutputPreview = {
  pageCount?: number;
  itemCount?: number;
  pageImage?: {
    page_index: number;
    width: number;
    height: number;
    image_base64?: string;
    image_url?: string;
  };
  thumbnailBase64?: string;
  textSnippets?: string[];
  markdownPreview?: string;
  jsonPreview?: unknown;
};

export type NodeCachedOutput = {
  kind:
    | "pages"
    | "page"
    | "regions"
    | "lines"
    | "reading_order"
    | "tables"
    | "formulas"
    | "figures"
    | "document"
    | "text"
    | "json";
  raw: unknown;
  preview?: OutputPreview;
};

export type ModelCatalogEntry = {
  id: string;
  category: string;
  provider: string;
  status: string;
  compute: string;
  license: string;
  python_extra: string | null;
  display_name: string | null;
  notes: string | null;
};

export type CategoryMeta = {
  id: string;
  display_name: string;
  status: string;
};

export type ProviderRuntime = {
  provider: string;
  running: boolean;
  mode: string;
  detail: string | null;
};

export type RuntimeAvailability = {
  mode: string;
  providers: ProviderRuntime[];
};

export type NodeRunErrorCode =
  | "model_load"
  | "model_inference"
  | "model_validation"
  | "no_input"
  | "payload_build"
  | "readiness"
  | "provider_offline"
  | "authentication"
  | "unknown";

export type NodeRunErrorContext = {
  inputSummary?: string;
  modelId?: string;
  nodeLabel?: string;
};

export type NodeRunResult = {
  pageCount?: number;
  previewBase64?: string;
  error?: string;
  errorCode?: NodeRunErrorCode;
  errorContext?: NodeRunErrorContext;
};

export type PipelineNodeRuntime = {
  runStatus?: "idle" | "running" | "success" | "error";
  lastRunAt?: string;
  runResult?: NodeRunResult;
  outputPanelOpen?: boolean;
  cachedOutput?: NodeCachedOutput | null;
  /** Linked Page Branch satellite for Select Page anchors. */
  pageBranchNodeId?: string;
  /** Linked Region Branch satellite for layout detection anchors. */
  regionBranchNodeId?: string;
  /** Linked Caption Branch satellite for figure caption anchors. */
  captionBranchNodeId?: string;
  /** Linked Document Branch satellite for document converter anchors. */
  documentBranchNodeId?: string;
  /** Resizable pages panel dimensions for Page Branch nodes. */
  branchPanelWidth?: number;
  branchPanelHeight?: number;
  /** Caption Branch: render upstream text as Markdown instead of plain text. */
  captionMarkdownPreview?: boolean;
};

export type PipelineNodeRecord = {
  id: string;
  modelId: string;
  position: { x: number; y: number };
  config?: Record<string, string | boolean | number>;
  runtime?: PipelineNodeRuntime;
};

export type PipelineEdgeRecord = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  valid?: boolean;
  /** Locked Select Page → Page Branch companion link. */
  companion?: boolean;
};

export type PipelineViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type PipelineGraph = {
  nodes: PipelineNodeRecord[];
  edges: PipelineEdgeRecord[];
  viewport?: PipelineViewport;
};

export type PipelineNodeData = {
  modelId: string;
  label: string;
  category: string;
  categoryLabel: string;
  provider: string;
  inputType: string;
  outputType: string;
  params: Record<string, string | boolean | number>;
  categoryColor: string;
  compute?: string;
  cachedOutput?: NodeCachedOutput | null;
  outputPanelOpen?: boolean;
  runStatus?: "idle" | "running" | "success" | "error";
  runResult?: NodeRunResult;
  lastRunAt?: string;
  /** Linked Page Branch satellite for Select Page anchors. */
  pageBranchNodeId?: string;
  /** Linked Region Branch satellite for layout detection anchors. */
  regionBranchNodeId?: string;
  /** Linked Caption Branch satellite for figure caption anchors. */
  captionBranchNodeId?: string;
  /** Linked Document Branch satellite for document converter anchors. */
  documentBranchNodeId?: string;
  /** Resizable pages panel dimensions for Page Branch nodes. */
  branchPanelWidth?: number;
  branchPanelHeight?: number;
  /** Caption Branch: render upstream text as Markdown instead of plain text. */
  captionMarkdownPreview?: boolean;
  /** Custom user pipeline composite node fields */
  pipelineId?: string;
  pipelineName?: string;
  pipelineDescription?: string | null;
  pipelineLogoUrl?: string | null;
  pipelineAccentColor?: string;
  internalNodeCount?: number;
  internalModelIds?: string[];
  inputWireKind?: string;
  outputWireKind?: string;
  subRunProgress?: { completed: number; total: number };
};

export type CategoryWireTypes = {
  input: string;
  output: string;
};

export const PIPELINE_NODE_TYPE = "pipelineNode" as const;
export const CUSTOM_PIPELINE_NODE_TYPE = "customPipelineNode" as const;

export const DRAG_MODEL_MIME = "application/reactflow";
export const DRAG_PIPELINE_MIME = "application/ocrflow-pipeline";

export type GraphEntityContext =
  | { kind: "project"; id: string }
  | { kind: "pipeline"; id: string };
