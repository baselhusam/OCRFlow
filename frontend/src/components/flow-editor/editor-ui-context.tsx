"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Connection } from "@xyflow/react";

export type InspectorTab = "parameters" | "preview" | "connections";

/** Where the quick-add menu opens and what it should wire the new node to. */
export type QuickAddRequest = {
  /** Screen position (client px) for the menu. */
  screen: { x: number; y: number };
  /** Flow position for the new node. */
  flow: { x: number; y: number };
  /** Wire the new node's input from this pin (wire dropped on empty canvas). */
  fromNodeId?: string;
  fromHandleId?: string | null;
};

/** Per-node state of a backend "Run all", derived from run progress. */
export type FullRunNodeState = "queued" | "running" | "done" | "failed";

export type EditorUi = {
  readOnly: boolean;
  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  setInspectorTab: (tab: InspectorTab) => void;
  /** Select a node and open the inspector on a tab. */
  openInspector: (nodeId: string, tab?: InspectorTab) => void;
  closeInspector: () => void;
  quickAdd: QuickAddRequest | null;
  openQuickAdd: (request: QuickAddRequest) => void;
  closeQuickAdd: () => void;
  quickSettingsNodeId: string | null;
  setQuickSettingsNodeId: (nodeId: string | null) => void;
  /** Soft delete with an Undo toast. */
  deleteNodes: (nodeIds: string[]) => void;
  duplicateNode: (nodeId: string) => void;
  /** Add a node to the right of `fromNodeId`, wired from its output, and select it. */
  addConnectedNode: (modelId: string, fromNodeId: string, fromHandleId?: string | null) => void;
  isValidConnection: (connection: Connection) => boolean;
  fullRunNodeStates: ReadonlyMap<string, FullRunNodeState>;
  /** Wall-clock ms when the current single-node or full run started. */
  runStartedAt: number | null;
};

const EditorUiContext = createContext<EditorUi | null>(null);

export function EditorUiProvider({
  value,
  children,
}: {
  value: EditorUi;
  children: ReactNode;
}) {
  return <EditorUiContext.Provider value={value}>{children}</EditorUiContext.Provider>;
}

export function useEditorUi(): EditorUi {
  const ctx = useContext(EditorUiContext);
  if (!ctx) throw new Error("useEditorUi must be used inside EditorUiProvider");
  return ctx;
}

/*
 * Which node's hover toolbar is showing. Kept outside React context so a hover
 * only re-renders the nodes whose "is another node hovered?" answer changes.
 * Only one toolbar shows at a time: the hovered node wins over the selected one
 * (two toolbars collide as soon as the canvas is zoomed out).
 */
let hoveredNodeId: string | null = null;
const hoverListeners = new Set<() => void>();

export function setHoveredToolbarNode(nodeId: string | null) {
  if (hoveredNodeId === nodeId) return;
  hoveredNodeId = nodeId;
  hoverListeners.forEach((listener) => listener());
}

/** Clear the hover only if `nodeId` still owns it (leaving A after entering B). */
export function clearHoveredToolbarNode(nodeId: string) {
  if (hoveredNodeId === nodeId) setHoveredToolbarNode(null);
}

function subscribeHover(listener: () => void) {
  hoverListeners.add(listener);
  return () => hoverListeners.delete(listener);
}

/** True while a different node than `nodeId` is hovered. */
export function useOtherNodeHovered(nodeId: string): boolean {
  return useSyncExternalStore(
    subscribeHover,
    () => hoveredNodeId !== null && hoveredNodeId !== nodeId,
    () => false,
  );
}
