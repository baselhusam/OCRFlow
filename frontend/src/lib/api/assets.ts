export type AssetUploadResponse = {
  asset_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  format: "pdf" | "image";
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

export function getProjectAssetUrl(projectId: string, assetId: string): string {
  return `/api/projects/${projectId}/assets/${assetId}`;
}
