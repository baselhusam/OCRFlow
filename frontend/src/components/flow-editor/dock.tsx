"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import {
  Hand,
  LayoutGrid,
  Map as MapIcon,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";

import { ToolButton } from "@/components/flow-editor/tool-button";
import { shortcutLabel } from "@/lib/keyboard-shortcuts";

type DockProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTidy: () => void;
  mode: "select" | "pan";
  onModeChange: (mode: "select" | "pan") => void;
  minimap: boolean;
  onToggleMinimap: () => void;
  readOnly: boolean;
  hasNodes: boolean;
  /** Width covered on the right by an overlaid panel; the dock centres in what's left. */
  rightInset?: number;
};

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}

/** Floating bottom-center control dock: history · zoom · layout · tools. */
export function Dock({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTidy,
  mode,
  onModeChange,
  minimap,
  onToggleMinimap,
  readOnly,
  hasNodes,
  rightInset = 0,
}: DockProps) {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-1/2 z-10 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center overflow-x-auto rounded-2xl border border-border bg-card/85 p-1 shadow-[0_10px_30px_-14px_rgba(20,18,37,0.35)] backdrop-blur-md transition-[left] duration-200 [scrollbar-width:none]"
      // Never let the shifted dock slide off the left edge (~half its width + gutter).
      style={rightInset ? { left: `max(calc(50% - ${rightInset / 2}px), 196px)` } : undefined}
    >
      {!readOnly ? (
        <>
          <ToolButton label="Undo" shortcut={shortcutLabel("Mod Z")} onClick={onUndo} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton label="Redo" shortcut={shortcutLabel("Mod Shift Z")} onClick={onRedo} disabled={!canRedo}>
            <Redo2 className="size-4" />
          </ToolButton>
          <Divider />
        </>
      ) : null}
      <ToolButton label="Zoom out" shortcut="−" onClick={() => void zoomOut({ duration: 160 })}>
        <Minus className="size-4" />
      </ToolButton>
      <button
        type="button"
        onClick={() => void zoomTo(1, { duration: 200 })}
        title="Reset to 100%"
        className="h-8 min-w-[52px] rounded-lg px-1 font-mono text-[11px] text-muted-foreground tabular-nums transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolButton label="Zoom in" shortcut="+" onClick={() => void zoomIn({ duration: 160 })}>
        <Plus className="size-4" />
      </ToolButton>
      <Divider />
      <ToolButton
        label="Fit to screen"
        shortcut="Shift 1"
        onClick={() => void fitView({ padding: 0.2, maxZoom: 1, duration: 260 })}
        disabled={!hasNodes}
      >
        <Maximize className="size-4" />
      </ToolButton>
      {!readOnly ? (
        <ToolButton label="Tidy up layout" shortcut="Shift L" onClick={onTidy} disabled={!hasNodes}>
          <LayoutGrid className="size-4" />
        </ToolButton>
      ) : null}
      <Divider />
      <ToolButton label="Select" shortcut="V" active={mode === "select"} onClick={() => onModeChange("select")}>
        <MousePointer2 className="size-4" />
      </ToolButton>
      <ToolButton label="Hand (pan)" shortcut="H" active={mode === "pan"} onClick={() => onModeChange("pan")}>
        <Hand className="size-4" />
      </ToolButton>
      <ToolButton label={minimap ? "Hide minimap" : "Show minimap"} shortcut="M" active={minimap} onClick={onToggleMinimap}>
        <MapIcon className="size-4" />
      </ToolButton>
    </div>
  );
}
