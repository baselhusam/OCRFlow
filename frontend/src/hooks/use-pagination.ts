"use client";

import { useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

type UsePaginationOptions = {
  pageSize?: number;
  initialPage?: number;
};

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(options.initialPage ?? 1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function resetPage() {
    setPage(1);
  }

  return {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    rangeStart,
    rangeEnd,
    goToPage,
    resetPage,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}
