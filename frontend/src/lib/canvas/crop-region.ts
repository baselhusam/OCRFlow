export type NormalizedBBox = [number, number, number, number];

/** Data URL or http(s) URL for a page image, whichever the artifact carries. */
export function pageImageSrc(
  page: { image_base64?: string | null; image_url?: string | null } | null | undefined,
): string | null {
  if (!page) return null;
  if (page.image_base64) return `data:image/png;base64,${page.image_base64}`;
  return page.image_url || null;
}

export function cropBboxFromBase64(
  imageBase64: string,
  bbox: NormalizedBBox,
  maxWidth = 160,
): Promise<string | null> {
  return cropImageRegion(`data:image/png;base64,${imageBase64}`, bbox, maxWidth);
}

/** Crop a normalized bbox out of any loadable image source; returns base64 PNG. */
export function cropImageRegion(
  src: string,
  bbox: NormalizedBBox,
  maxWidth = 160,
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const [x0, y0, x1, y1] = bbox;
      const left = Math.round(x0 * img.width);
      const top = Math.round(y0 * img.height);
      const width = Math.max(1, Math.round((x1 - x0) * img.width));
      const height = Math.max(1, Math.round((y1 - y0) * img.height));
      const scale = Math.min(1, maxWidth / width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, left, top, width, height, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      resolve(dataUrl.split(",")[1] ?? null);
    };
    img.onerror = () => resolve(null);
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.src = src;
  });
}
