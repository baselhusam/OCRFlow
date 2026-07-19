"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/utils";

export type BranchPanelSize = {
  width: number;
  height: number;
};

type BranchPanelResizeBounds = {
  min: BranchPanelSize;
  max: BranchPanelSize;
};

type UseBranchPanelResizeOptions = BranchPanelResizeBounds & {
  width: number;
  height: number;
  onResizeEnd: (size: BranchPanelSize) => void;
};

function clampPanelSize(
  size: BranchPanelSize,
  bounds: BranchPanelResizeBounds,
): BranchPanelSize {
  return {
    width: Math.min(bounds.max.width, Math.max(bounds.min.width, Math.round(size.width))),
    height: Math.min(
      bounds.max.height,
      Math.max(bounds.min.height, Math.round(size.height)),
    ),
  };
}

export function useBranchPanelResize({
  width,
  height,
  min,
  max,
  onResizeEnd,
}: UseBranchPanelResizeOptions) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isResizingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [panelSize, setPanelSizeState] = useState(() =>
    clampPanelSize({ width, height }, { min, max }),
  );
  const panelSizeRef = useRef(panelSize);

  const setPanelSize = useCallback(
    (nextSize: BranchPanelSize) => {
      const clamped = clampPanelSize(nextSize, { min, max });
      panelSizeRef.current = clamped;
      setPanelSizeState(clamped);
    },
    [max, min],
  );

  useLayoutEffect(() => {
    if (isResizingRef.current) return;
    setPanelSize({ width, height });
  }, [height, setPanelSize, width]);

  useLayoutEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const panelEl = panelRef.current;
      if (!panelEl) return;

      event.preventDefault();
      event.stopPropagation();

      cleanupRef.current?.();

      const handleEl = event.currentTarget;
      const pointerId = event.pointerId;
      const panelRect = panelEl.getBoundingClientRect();
      const startWidth = panelEl.offsetWidth || panelSizeRef.current.width;
      const startHeight = panelEl.offsetHeight || panelSizeRef.current.height;
      const scaleX = startWidth > 0 ? panelRect.width / startWidth : 1;
      const scaleY = startHeight > 0 ? panelRect.height / startHeight : 1;
      const startX = event.clientX;
      const startY = event.clientY;

      isResizingRef.current = true;
      setIsResizing(true);
      handleEl.setPointerCapture?.(pointerId);

      const cleanup = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
        handleEl.releasePointerCapture?.(pointerId);
        isResizingRef.current = false;
        setIsResizing(false);
        cleanupRef.current = null;
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        setPanelSize({
          width: startWidth + (moveEvent.clientX - startX) / (scaleX || 1),
          height: startHeight + (moveEvent.clientY - startY) / (scaleY || 1),
        });
      };

      const handlePointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        endEvent.preventDefault();
        endEvent.stopPropagation();
        cleanup();
        onResizeEnd(panelSizeRef.current);
      };

      cleanupRef.current = cleanup;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);
    },
    [onResizeEnd, setPanelSize],
  );

  return {
    panelRef,
    panelSize,
    isResizing,
    handleResizePointerDown,
  };
}

type BranchPanelResizeHandleProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  className?: string;
};

export function BranchPanelResizeHandle({
  onPointerDown,
  className,
}: BranchPanelResizeHandleProps) {
  return (
    <button
      type="button"
      aria-label="Resize branch panel"
      title="Drag corner to resize"
      className={cn(
        "nodrag nopan absolute right-0 bottom-0 z-20 flex size-7 cursor-nwse-resize items-end justify-end rounded-br-xl bg-transparent p-1.5 text-muted-foreground/45 transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={onPointerDown}
    >
      <span
        aria-hidden
        className="pointer-events-none block size-3 rounded-br-[5px] border-r-2 border-b-2 border-current"
      />
    </button>
  );
}
