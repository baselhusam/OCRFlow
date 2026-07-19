import type { Edge, Node } from "@xyflow/react";

import { PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import {
  getParentSelectPageId,
  isPageAtAnchor,
  isPageBranchNode,
  PAGE_AT_MODEL_ID,
  PAGE_BRANCH_MODEL_ID,
  PAGE_BRANCH_SPAWN_OFFSET,
  PARENT_SELECT_PAGE_PARAM,
} from "@/lib/canvas/page-branch-meta";
import { parseSourceHandle, buildItemHandle } from "@/lib/canvas/output-slice";
import type {
  ModelCatalogEntry,
  PipelineGraph,
  PipelineNodeData,
  PipelineNodeRecord,
} from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE } from "@/lib/canvas/types";

export function isCompanionEdge(edge: Edge): boolean {
  return edge.data?.companion === true;
}

export function createNodeId(modelId: string): string {
  return `${modelId}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createCompanionEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}-companion`;
}

export function buildCompanionEdge(
  sourceId: string,
  targetId: string,
  valid = true,
): Edge {
  return {
    id: createCompanionEdgeId(sourceId, targetId),
    type: PIPELINE_FLOW_EDGE_TYPE,
    source: sourceId,
    target: targetId,
    sourceHandle: "output",
    targetHandle: "input",
    data: { valid, companion: true },
    className: valid ? "ocrflow-edge-valid" : "ocrflow-edge-invalid",
  };
}

export function buildPageBranchNode(
  anchorId: string,
  position: { x: number; y: number },
  entry: ModelCatalogEntry,
  categoryLabel: string,
  pageIndex = 0,
): Node<PipelineNodeData> {
  const data = buildPipelineNodeData(entry, categoryLabel, {
    page_index: pageIndex,
    [PARENT_SELECT_PAGE_PARAM]: anchorId,
  });

  return {
    id: createNodeId(PAGE_BRANCH_MODEL_ID),
    type: PIPELINE_NODE_TYPE,
    position,
    data,
  };
}

export function findPageBranchForAnchor(
  anchorId: string,
  nodes: Node<PipelineNodeData>[],
): Node<PipelineNodeData> | undefined {
  return nodes.find(
    (node) =>
      isPageBranchNode(node.data.modelId) &&
      getParentSelectPageId(node.data.params) === anchorId,
  );
}

export function collectCascadeRemovalIds(
  removedIds: string[],
  nodes: Node<PipelineNodeData>[],
): string[] {
  const cascade = new Set<string>();
  const removedSet = new Set(removedIds);

  for (const id of removedIds) {
    const node = nodes.find((entry) => entry.id === id);
    if (!node) continue;

    if (isPageAtAnchor(node.data.modelId) && node.data.pageBranchNodeId) {
      const branchId = node.data.pageBranchNodeId;
      if (!removedSet.has(branchId)) cascade.add(branchId);
    }
  }

  return [...cascade];
}

function migrateBranchOutputHandle(
  edge: { source: string; sourceHandle?: string | null },
  nodes: PipelineNodeRecord[],
): string | undefined {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  if (!sourceNode || !isPageBranchNode(sourceNode.modelId)) return undefined;

  const handle = edge.sourceHandle ?? "output";
  const parsed = parseSourceHandle(handle);
  if (parsed.scope !== "all") return undefined;

  const pageIndex = Number(sourceNode.config?.page_index ?? 0);
  return buildItemHandle("page", String(pageIndex));
}

function migrateAllBranchOutputEdges(
  edges: PipelineGraph["edges"],
  nodes: PipelineNodeRecord[],
): boolean {
  let changed = false;
  for (const edge of edges) {
    const migratedHandle = migrateBranchOutputHandle(edge, nodes);
    if (migratedHandle) {
      edge.sourceHandle = migratedHandle;
      changed = true;
    }
  }
  return changed;
}

function edgeSourcesPageAtDownstream(edge: Edge, anchorId: string): boolean {
  if (edge.source !== anchorId) return false;
  const handle = edge.sourceHandle ?? "output";
  const parsed = parseSourceHandle(handle);
  if (parsed.scope === "item" && parsed.itemKind === "page") return true;
  return handle === "output";
}

type MigrateContext = {
  modelMap: Map<string, ModelCatalogEntry>;
  categoryLabels: Map<string, string>;
};

function resolveNodeData(
  record: PipelineNodeRecord,
  ctx: MigrateContext,
): PipelineNodeData | null {
  const entry = ctx.modelMap.get(record.modelId);
  if (!entry) return null;
  return buildPipelineNodeData(
    entry,
    ctx.categoryLabels.get(entry.category) ?? entry.category,
    record.config,
  );
}

/** Auto-migrate legacy page-at graphs that wired downstream directly from the anchor. */
export function migratePageAtGraph(
  graph: PipelineGraph,
  ctx: MigrateContext,
): PipelineGraph {
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  let changed = false;

  const entry = ctx.modelMap.get(PAGE_BRANCH_MODEL_ID);
  if (!entry) return graph;

  for (const record of [...nodes]) {
    if (record.modelId !== PAGE_AT_MODEL_ID) continue;

    const runtime = record.runtime ?? {};
    const existingBranchId = runtime.pageBranchNodeId;
    const existingBranch = existingBranchId
      ? nodes.find((node) => node.id === existingBranchId)
      : undefined;

    const downstreamEdges = edges.filter((edge) =>
      edgeSourcesPageAtDownstream(edge, record.id),
    );
    const hasLegacyDownstream = downstreamEdges.some(
      (edge) => edge.target !== existingBranchId,
    );
    const pageIndex = Number(record.config?.page_index ?? 0);
    const needsMigration =
      hasLegacyDownstream ||
      (pageIndex > 0 && !existingBranch) ||
      (downstreamEdges.length > 0 && !existingBranch);

    if (!needsMigration) continue;

    let branchId = existingBranch?.id;
    let branchRecord = existingBranch;

    if (!branchRecord) {
      branchId = createNodeId(PAGE_BRANCH_MODEL_ID);
      const anchorPos = record.position;
      branchRecord = {
        id: branchId,
        modelId: PAGE_BRANCH_MODEL_ID,
        position: {
          x: anchorPos.x + PAGE_BRANCH_SPAWN_OFFSET.x,
          y: anchorPos.y + PAGE_BRANCH_SPAWN_OFFSET.y,
        },
        config: {
          page_index: pageIndex,
          [PARENT_SELECT_PAGE_PARAM]: record.id,
        },
      };
      nodes.push(branchRecord);
      changed = true;

      const companion = {
        id: createCompanionEdgeId(record.id, branchId),
        source: record.id,
        target: branchId,
        sourceHandle: "output",
        targetHandle: "input",
        valid: true,
        companion: true,
      };
      if (!edges.some((edge) => edge.id === companion.id)) {
        edges.push(companion);
      }
    }

    if (!branchId || !branchRecord) continue;

    record.runtime = {
      ...runtime,
      pageBranchNodeId: branchId,
    };
    record.config = { ...(record.config ?? {}) };
    changed = true;

    if (branchRecord.config?.page_index === undefined) {
      branchRecord.config = {
        ...(branchRecord.config ?? {}),
        page_index: pageIndex,
        [PARENT_SELECT_PAGE_PARAM]: record.id,
      };
    }

    for (const edge of downstreamEdges) {
      if (edge.target === branchId) continue;
      edge.source = branchId;
      const migratedHandle = migrateBranchOutputHandle(edge, nodes);
      if (migratedHandle) {
        edge.sourceHandle = migratedHandle;
      }
      changed = true;
    }
  }

  if (migrateAllBranchOutputEdges(edges, nodes)) {
    changed = true;
  }

  if (!changed) return graph;
  return { ...graph, nodes, edges };
}

export function applyMigrationToFlowNodes(
  graph: PipelineGraph,
  ctx: MigrateContext,
): {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
} {
  const migrated = migratePageAtGraph(graph, ctx);
  const nodes = migrated.nodes.flatMap((record) => {
    const data = resolveNodeData(record, ctx);
    if (!data) return [];
    const runtime = record.runtime;
    return [
      {
        id: record.id,
        type: PIPELINE_NODE_TYPE,
        position: record.position,
        data: {
          ...data,
          params: record.config ?? data.params,
          runStatus: runtime?.runStatus ?? data.runStatus,
          lastRunAt: runtime?.lastRunAt,
          runResult: runtime?.runResult,
          outputPanelOpen: runtime?.outputPanelOpen,
          pageBranchNodeId: runtime?.pageBranchNodeId,
          branchPanelWidth: runtime?.branchPanelWidth,
          branchPanelHeight: runtime?.branchPanelHeight,
          cachedOutput: runtime?.cachedOutput ?? data.cachedOutput,
        },
      },
    ];
  });

  const edges = migrated.edges.map((edge) => ({
    id: edge.id,
    type: PIPELINE_FLOW_EDGE_TYPE,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? "output",
    targetHandle: edge.targetHandle ?? "input",
    data: {
      valid: edge.valid !== false,
      companion: edge.companion === true,
    },
    className: edge.valid === false ? "ocrflow-edge-invalid" : "ocrflow-edge-valid",
  }));

  return { nodes, edges };
}
