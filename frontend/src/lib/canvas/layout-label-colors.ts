/** Muted layout label colors aligned with OCRFlow category accents. */
export const LAYOUT_LABEL_COLORS: Record<string, string> = {
  paragraph: "#3685bf",
  title: "#7754d9",
  section_header: "#7754d9",
  table: "#1f8a65",
  figure: "#5a6cc0",
  picture: "#9386f2",
  list: "#3fa266",
  list_item: "#3fa266",
  header: "#767a85",
  footer: "#767a85",
  page_header: "#8e6e48",
  page_footer: "#8e6e48",
  caption: "#c08532",
  formula: "#b8448b",
  code: "#d08770",
  other: "#767a85",
};

export function layoutLabelColor(label: string): string {
  const key = label.toLowerCase().replace(/[\s-]+/g, "_");
  return LAYOUT_LABEL_COLORS[key] ?? LAYOUT_LABEL_COLORS.other;
}
