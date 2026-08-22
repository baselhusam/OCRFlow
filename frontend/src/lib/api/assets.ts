import type { GraphEntityContext } from "@/lib/canvas/types";

export type AssetUploadResponse = {
  asset_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  format: "pdf" | "image";
};

export type AssetBatchUploadResponse = {
  items: AssetUploadResponse[];
};

export async function uploadProjectAsset(
  projectId: string,
  file: File,
): Promise<AssetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/projects/${projectId}/assets`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "Upload failed";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return (await response.json()) as AssetUploadResponse;
}

export async function uploadPipelineAsset(
  pipelineId: string,
  file: File,
): Promise<AssetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/pipelines/${pipelineId}/assets`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "Upload failed";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Preserve the fallback message for non-JSON responses.
    }
    throw new Error(detail);
  }

  return (await response.json()) as AssetUploadResponse;
}

export async function uploadProjectAssetsBatch(
  projectId: string,
  files: File[],
): Promise<AssetBatchUploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`/api/projects/${projectId}/assets/batch`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "Batch upload failed";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return (await response.json()) as AssetBatchUploadResponse;
}

export async function startProjectBatchRuns(
  projectId: string,
  assetIds: string[],
): Promise<{ items: Array<{ id: string; status: string }> }> {
  const response = await fetch(`/api/projects/${projectId}/batch-runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_ids: assetIds }),
  });

  if (!response.ok) {
    let detail = "Batch run failed";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return (await response.json()) as {
    items: Array<{ id: string; status: string }>;
  };
}

export function getProjectAssetUrl(projectId: string, assetId: string): string {
  return `/api/projects/${projectId}/assets/${assetId}`;
}

export function getPipelineAssetUrl(pipelineId: string, assetId: string): string {
  return `/api/pipelines/${pipelineId}/assets/${assetId}`;
}

export function getGraphAssetNamespace(entity: GraphEntityContext): string {
  return entity.kind === "project" ? entity.id : `pipeline-${entity.id}`;
}
