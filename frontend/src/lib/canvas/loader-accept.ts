/**
 * Which document types each source loader can actually open. `loader/pdf`
 * rasterizes with PDFium and `loader/image` decodes bitmaps, so offering the
 * union to both only produces a confusing "Failed to open PDF" at run time.
 */
const PDF_TYPES = ["application/pdf"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

type LoaderAccept = {
  /** Value for `<input accept>`. */
  accept: string;
  /** Short hint shown under the dropzone. */
  label: string;
  /** Wording for the drop prompt. */
  prompt: string;
  /** Returns an error message when the file can't be opened by this loader. */
  reject: (file: File) => string | null;
};

const PDF_ACCEPT: LoaderAccept = {
  accept: PDF_TYPES.join(","),
  label: "PDF",
  prompt: "Drop a PDF",
  reject: (file) =>
    file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      ? null
      : "PDF Loader only opens PDF files. Use an Image Loader for PNG, JPEG, or WebP.",
};

const IMAGE_ACCEPT: LoaderAccept = {
  accept: IMAGE_TYPES.join(","),
  label: "PNG, JPEG, WebP",
  prompt: "Drop an image",
  reject: (file) =>
    IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name)
      ? null
      : "Image Loader only opens PNG, JPEG, or WebP. Use a PDF Loader for PDFs.",
};

const ANY_ACCEPT: LoaderAccept = {
  accept: [...PDF_TYPES, ...IMAGE_TYPES].join(","),
  label: "PDF, PNG, JPEG, WebP",
  prompt: "Drop PDF or image",
  reject: () => null,
};

export function getLoaderAccept(modelId: string | undefined): LoaderAccept {
  if (modelId === "loader/pdf") return PDF_ACCEPT;
  if (modelId === "loader/image") return IMAGE_ACCEPT;
  return ANY_ACCEPT;
}
