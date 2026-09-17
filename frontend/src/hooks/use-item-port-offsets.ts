"use client";

import { useUpdateNodeInternals } from "@xyflow/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Keeps one React Flow handle per gallery row, pinned to the node's right
 * border at the row's vertical centre. Rows register themselves via
 * `registerRow`; offsets are re-measured on scroll, resize and layout
 * changes and only the rows visible inside the scroll container get a port.
 */
export function useItemPortOffsets(
  nodeId: string,
  nodeRef: React.RefObject<HTMLDivElement | null>,
  deps: unknown[],
) {
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const scrollRef = useRef<HTMLElement | null>(null);
  const offsetsRef = useRef<Record<string, number>>({});
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const updateNodeInternals = useUpdateNodeInternals();

  const measure = useCallback(() => {
    const nodeEl = nodeRef.current;
    if (!nodeEl) return;
    const nodeRect = nodeEl.getBoundingClientRect();
    // The canvas is zoomed with a CSS transform; convert back to node pixels.
    const scaleY =
      nodeEl.offsetHeight > 0 ? nodeRect.height / nodeEl.offsetHeight : 1;
    const clip = scrollRef.current?.getBoundingClientRect();
    const next: Record<string, number> = {};
    for (const [key, row] of rowRefs.current.entries()) {
      const rect = row.getBoundingClientRect();
      if (clip && (rect.bottom <= clip.top || rect.top >= clip.bottom))
        continue;
      const centerY = rect.top + rect.height / 2;
      next[key] = Math.round(((centerY - nodeRect.top) / scaleY) * 2) / 2;
    }
    const prev = offsetsRef.current;
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const same =
      prevKeys.length === nextKeys.length &&
      nextKeys.every((k) => prev[k] === next[k]);
    if (same) return;
    offsetsRef.current = next;
    setOffsets(next);
    requestAnimationFrame(() => updateNodeInternals(nodeId));
  }, [nodeId, nodeRef, updateNodeInternals]);

  const measureRef = useRef(measure);
  useLayoutEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  useLayoutEffect(() => {
    measure();
    // Callers list what should trigger a re-measure (item count, panel size…).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  useLayoutEffect(() => {
    const nodeEl = nodeRef.current;
    if (!nodeEl) return;
    const observer = new ResizeObserver(() => measureRef.current());
    observer.observe(nodeEl);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [nodeRef]);

  const registerRow = useCallback(
    (key: string, element: HTMLElement | null) => {
      if (element) rowRefs.current.set(key, element);
      else rowRefs.current.delete(key);
      requestAnimationFrame(() => measureRef.current());
    },
    [],
  );

  const registerScrollContainer = useCallback((element: HTMLElement | null) => {
    scrollRef.current = element;
    if (element) requestAnimationFrame(() => measureRef.current());
  }, []);

  const onScroll = useCallback(() => {
    measureRef.current();
  }, []);

  return {
    offsets,
    registerRow,
    registerScrollContainer,
    onScroll,
    remeasure: measure,
  };
}
