import type { NodeRunErrorCode, NodeRunErrorContext } from "@/lib/canvas/types";

export class InferenceError extends Error {
  errorCode?: NodeRunErrorCode;

  constructor(message: string, errorCode?: NodeRunErrorCode) {
    super(message);
    this.name = "InferenceError";
    this.errorCode = errorCode;
  }
}

const BACKEND_ERROR_CODE_MAP: Record<string, NodeRunErrorCode> = {
  model_load: "model_load",
  model_inference: "model_inference",
  model_validation: "model_validation",
  model_not_found: "model_load",
};

export function mapBackendErrorCode(code: string): NodeRunErrorCode {
  return BACKEND_ERROR_CODE_MAP[code] ?? "unknown";
}

export function classifyRunError(
  error: unknown,
  options?: { explicitCode?: NodeRunErrorCode; httpStatus?: number },
): NodeRunErrorCode {
  if (options?.explicitCode) return options.explicitCode;
  if (error instanceof InferenceError && error.errorCode) return error.errorCode;

  const message = error instanceof Error ? error.message : String(error);

  if (/Model .* timed out after/i.test(message)) return "model_inference";
  if (/ModelLoadError/i.test(message)) return "model_load";
  if (/ModelValidationError/i.test(message)) return "model_validation";
  if (/ModelInferenceError/i.test(message)) return "model_inference";
  if (/ModelNotFoundError/i.test(message)) return "model_load";

  const lower = message.toLowerCase();

  if (
    lower.includes("session expired") ||
    lower.includes("not authenticated") ||
    options?.httpStatus === 401
  ) {
    return "authentication";
  }

  if (
    lower.includes("not ready") ||
    lower.includes("no input") ||
    lower.includes("upload a file") ||
    lower.includes("connect an upstream")
  ) {
    return "no_input";
  }
  if (lower.includes("validation")) return "model_validation";
  if (lower.includes("not ready to run") || lower.includes("payload")) {
    return "payload_build";
  }
  if (
    lower.includes("failed to load") ||
    lower.includes("model load") ||
    lower.includes("model server")
  ) {
    return "model_load";
  }
  if (options?.httpStatus === 422) return "model_validation";
  if (options?.httpStatus === 503) return "model_inference";

  return "unknown";
}

export function buildInputSummary(options: {
  upstreamNodeLabel?: string | null;
  upstreamPagesCount?: number;
  upstreamOutputKind?: string | null;
  hasAsset?: boolean;
  assetFilename?: string;
  modelId?: string;
}): string | undefined {
  const {
    upstreamNodeLabel,
    upstreamPagesCount,
    upstreamOutputKind,
    hasAsset,
    assetFilename,
    modelId,
  } = options;

  if (hasAsset && assetFilename) {
    return `File: ${assetFilename}`;
  }
  if (upstreamPagesCount !== undefined && upstreamPagesCount > 0) {
    const pageWord = upstreamPagesCount === 1 ? "page" : "pages";
    if (upstreamNodeLabel) {
      return `${upstreamPagesCount} ${pageWord} from "${upstreamNodeLabel}"`;
    }
    return `${upstreamPagesCount} ${pageWord}`;
  }
  if (upstreamNodeLabel && upstreamOutputKind) {
    return `Output from "${upstreamNodeLabel}" (${upstreamOutputKind})`;
  }
  if (upstreamNodeLabel) {
    return `Connected to "${upstreamNodeLabel}" (no cached output yet)`;
  }
  if (modelId?.startsWith("loader/")) {
    return "No document uploaded";
  }
  return undefined;
}

export function buildRunErrorResult(
  error: unknown,
  context: {
    nodeLabel: string;
    modelId: string;
    upstreamNodeLabel?: string | null;
    upstreamPagesCount?: number;
    upstreamOutputKind?: string | null;
    hasAsset?: boolean;
    assetFilename?: string;
    explicitCode?: NodeRunErrorCode;
    httpStatus?: number;
  },
): { error: string; errorCode: NodeRunErrorCode; errorContext: NodeRunErrorContext } {
  const message = error instanceof Error ? error.message : "Run failed";
  const errorCode = classifyRunError(error, {
    explicitCode: context.explicitCode,
    httpStatus: context.httpStatus,
  });
  const inputSummary = buildInputSummary(context);

  return {
    error: message,
    errorCode,
    errorContext: {
      inputSummary,
      modelId: context.modelId,
      nodeLabel: context.nodeLabel,
    },
  };
}

export type ErrorDiagnosticMeta = {
  label: string;
  badgeClassName: string;
  suggestion: string;
};

export function getErrorDiagnosticMeta(
  errorCode?: NodeRunErrorCode,
): ErrorDiagnosticMeta {
  switch (errorCode) {
    case "authentication":
      return {
        label: "Session expired",
        badgeClassName:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        suggestion:
          "Sign in again to continue. Your canvas changes are saved before authentication is requested again.",
      };
    case "model_load":
      return {
        label: "Model unavailable",
        badgeClassName:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        suggestion:
          "The model server may not be running or the model is not installed. Start the backend and verify the model dependency is available.",
      };
    case "model_inference":
      return {
        label: "Run failed",
        badgeClassName:
          "border-destructive/30 bg-destructive/10 text-destructive",
        suggestion:
          "Inference failed while processing the input. For full-document conversion, the first run can take several minutes while models load. Try again, use TableFormer Fast, or set OCRFLOW_DOCUMENT_CONVERSION_TIMEOUT higher on the backend.",
      };
    case "model_validation":
      return {
        label: "Invalid output",
        badgeClassName:
          "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
        suggestion:
          "The model returned output that failed validation. Review node parameters and confirm the upstream data matches what this model expects.",
      };
    case "no_input":
      return {
        label: "No input",
        badgeClassName:
          "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
        suggestion:
          "This node needs input before it can run. Upload a document, connect an upstream node, or run upstream nodes first.",
      };
    case "payload_build":
      return {
        label: "Not ready",
        badgeClassName:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        suggestion:
          "Required parameters or upstream data are missing. Open Setup and resolve the readiness issues listed for this node.",
      };
    case "readiness":
      return {
        label: "Blocked",
        badgeClassName:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        suggestion:
          "Fix the readiness issues on this node, then run it again or rerun the pipeline from the header.",
      };
    default:
      return {
        label: "Error",
        badgeClassName:
          "border-destructive/30 bg-destructive/10 text-destructive",
        suggestion:
          "Review the error message below, fix the underlying issue, and try running the node again.",
      };
  }
}
