/** Internal `page_index` is 0-based; users interact with 1-based page numbers. */
export const PAGE_INDEX_DISPLAY_OFFSET = 1;

export function pageIndexToDisplay(pageIndex: number): number {
  return pageIndex + PAGE_INDEX_DISPLAY_OFFSET;
}

export function displayToPageIndex(display: number): number {
  return display - PAGE_INDEX_DISPLAY_OFFSET;
}
