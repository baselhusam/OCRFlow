import {
  InferenceError,
  mapBackendErrorCode,
} from "@/lib/canvas/run-errors";
import type { NodeRunErrorCode } from "@/lib/canvas/types";

export type InferenceContext = {
  projectId?: string;
  nodeId?: string;
  runKind?: "test_run" | "pipeline_run";
};

export { InferenceError };

export async function runModelInference(
  modelId: string,
  payload: Record<string, unknown>,
  context?: InferenceContext,
): Promise<Record<string, unknown>> {
  const proxyPath = modelId.split("/").join("/");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (context?.projectId) {
    headers["X-OCRFlow-Project-Id"] = context.projectId;
  }
  if (context?.nodeId) {
    headers["X-OCRFlow-Node-Id"] = context.nodeId;
  }
  if (context?.runKind) {
    headers["X-OCRFlow-Run-Kind"] = context.runKind;
  }

  const response = await fetch(`/api/inference/models/${proxyPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    }
    throw new InferenceError(
      "Your session expired. Sign in again to continue.",
      "authentication",
    );
  }

  if (!response.ok) {
    let detail = "Inference failed";
    let errorCode: NodeRunErrorCode | undefined;
    try {
      const body = (await response.json()) as {
        detail?: string | unknown[];
        error_code?: string;
      };
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) {
        detail = body.detail.map((d) => JSON.stringify(d)).join("; ");
      }
      if (body.error_code) {
        errorCode = mapBackendErrorCode(body.error_code);
      }
    } catch {
      // ignore
    }
    throw new InferenceError(detail, errorCode);
  }

  return (await response.json()) as Record<string, unknown>;
}

/** @deprecated Use runModelInference */
export async function runLoaderInference(
  task: "pdf" | "image" | "page-at",
  payload: Record<string, unknown>,
  context?: InferenceContext,
): Promise<Record<string, unknown>> {
  const modelId =
    task === "pdf"
      ? "loader/pdf"
      : task === "image"
        ? "loader/image"
        : "loader/page-at";
  return runModelInference(modelId, payload, context);
}
