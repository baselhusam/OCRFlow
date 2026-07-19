"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Node, Edge } from "@xyflow/react";

import type { PipelineStep, PipelineRunState } from "@/lib/canvas/pipeline-execution";
import type { UpstreamContext } from "@/lib/canvas/resolve-upstream";
import type {
  CategoryMeta,
  ModelCatalogEntry,
  PipelineNodeData,
} from "@/lib/canvas/types";
import type { WireKind } from "@/lib/canvas/wire-types";
import type { SaveStatus } from "@/hooks/use-pipeline-graph";

export type PipelineGraphState = {
  projectId: string;
  entity?: import("@/lib/canvas/types").GraphEntityContext;
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  hasUnsavedChanges: boolean;
  pipelineRunState: PipelineRunState;
  pipelineSteps: PipelineStep[];
  focusPulseNodeId: string | null;
  modelCatalog: ModelCatalogEntry[];
  categories: CategoryMeta[];
};

export type PipelineGraphActions = {
  saveNow: () => Promise<boolean>;
  updateNodeConfig: (
    nodeId: string,
    partial: Record<string, string | boolean | number>,
  ) => void;
  updateNodeData: (
    nodeId: string,
    partial: Partial<PipelineNodeData>,
    persist?: boolean,
  ) => void;
  toggleOutputPanel: (nodeId: string) => void;
  runNode: (nodeId: string) => Promise<boolean>;
  runFullPipeline: () => Promise<void>;
  clearNodeRunState: (nodeId: string) => void;
  clearAllRunState: () => void;
  getUpstream: (nodeId: string, requiredInput?: WireKind) => UpstreamContext;
  clearSelection: () => void;
  selectNode: (nodeId: string) => void;
  updateEdgeSourceHandle: (edgeId: string, sourceHandle: string) => void;
  addModelNode: (modelId: string, position: { x: number; y: number }) => void;
  addModelAtPosition: (modelId: string, position: { x: number; y: number }) => void;
  expandPageBranch: (anchorNodeId: string) => string | null;
  closePageBranch: (branchNodeId: string) => void;
  expandRegionBranch: (anchorNodeId: string) => string | null;
  closeRegionBranch: (branchNodeId: string) => void;
  expandCaptionBranch: (anchorNodeId: string) => string | null;
  closeCaptionBranch: (branchNodeId: string) => void;
  expandDocumentBranch: (anchorNodeId: string) => string | null;
  closeDocumentBranch: (branchNodeId: string) => void;
  focusNode: (nodeId: string) => void;
  autoLayout: () => void;
};

export const PipelineGraphStateContext = createContext<PipelineGraphState | null>(
  null,
);

export const PipelineGraphActionsContext =
  createContext<PipelineGraphActions | null>(null);

type PipelineGraphProviderProps = {
  state: PipelineGraphState;
  actions: PipelineGraphActions;
  children: ReactNode;
};

export function PipelineGraphProvider({
  state,
  actions,
  children,
}: PipelineGraphProviderProps) {
  const memoizedState = useMemo(
    () => state,
    [
      state.projectId,
      state.nodes,
      state.edges,
      state.selectedNodeId,
      state.selectedEdgeId,
      state.saveStatus,
      state.lastSavedAt,
      state.hasUnsavedChanges,
      state.pipelineRunState,
      state.pipelineSteps,
      state.focusPulseNodeId,
      state.modelCatalog,
      state.categories,
    ],
  );

  const memoizedActions = useMemo(
    () => actions,
    [
      actions.saveNow,
      actions.updateNodeConfig,
      actions.updateNodeData,
      actions.toggleOutputPanel,
      actions.runNode,
      actions.runFullPipeline,
      actions.clearNodeRunState,
      actions.clearAllRunState,
      actions.getUpstream,
      actions.clearSelection,
      actions.selectNode,
      actions.updateEdgeSourceHandle,
      actions.addModelNode,
      actions.addModelAtPosition,
      actions.expandPageBranch,
      actions.closePageBranch,
      actions.expandRegionBranch,
      actions.closeRegionBranch,
      actions.expandCaptionBranch,
      actions.closeCaptionBranch,
      actions.expandDocumentBranch,
      actions.closeDocumentBranch,
      actions.focusNode,
      actions.autoLayout,
    ],
  );

  return (
    <PipelineGraphActionsContext.Provider value={memoizedActions}>
      <PipelineGraphStateContext.Provider value={memoizedState}>
        {children}
      </PipelineGraphStateContext.Provider>
    </PipelineGraphActionsContext.Provider>
  );
}

/** @deprecated Use usePipelineGraphState + usePipelineGraphActions */
export const PipelineGraphContext = PipelineGraphStateContext;

export function usePipelineGraphState(): PipelineGraphState {
  const ctx = useContext(PipelineGraphStateContext);
  if (!ctx) {
    throw new Error(
      "usePipelineGraphState must be used within PipelineGraphProvider",
    );
  }
  return ctx;
}

export function usePipelineGraphActions(): PipelineGraphState & PipelineGraphActions {
  const state = usePipelineGraphState();
  const actions = useContext(PipelineGraphActionsContext);
  if (!actions) {
    throw new Error(
      "usePipelineGraphActions must be used within PipelineGraphProvider",
    );
  }
  return { ...state, ...actions };
}

export function usePipelineGraphActionsOnly(): PipelineGraphActions {
  const actions = useContext(PipelineGraphActionsContext);
  if (!actions) {
    throw new Error(
      "usePipelineGraphActionsOnly must be used within PipelineGraphProvider",
    );
  }
  return actions;
}
