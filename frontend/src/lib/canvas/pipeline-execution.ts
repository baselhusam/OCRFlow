import type { Edge, Node } from "@xyflow/react";

import { getNodeReadiness } from "@/lib/canvas/node-readiness";
import type { NodeRunErrorCode, PipelineNodeData } from "@/lib/canvas/types";
import { getModelWireKinds } from "@/lib/canvas/wire-types";
import { getUpstreamContext } from "@/lib/canvas/resolve-upstream";

export type PipelineRunState = {
  status: "idle" | "running" | "success" | "error";
  currentNodeId?: string;
  completedCount: number;
  totalCount: number;
  error?: string;
  failedNodeId?: string;
  failedNodeLabel?: string;
  errorCode?: NodeRunErrorCode;
  lastRunAt?: string;
  lastRunStatus?: "success" | "error";
};

export type PipelineStep = {
  nodeId: string;
  label: string;
  modelId: string;
  category: string;
  inputType: string;
  outputType: string;
  order: number;
  upstreamLabel: string | null;
  wireLabel: string | null;
  hasOutput: boolean;
  ready: boolean;
  issues: string[];
};

export type PipelineReadiness = {
  ready: boolean;
  runnableCount: number;
  issues: string[];
  steps: PipelineStep[];
};

export function topologicalSort(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): string[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = [...nodeIds].filter((id) => (inDegree.get(id) ?? 0) === 0);
  queue.sort((a, b) => {
    const nodeA = nodes.find((node) => node.id === a);
    const nodeB = nodes.find((node) => node.id === b);
    return (nodeA?.position.x ?? 0) - (nodeB?.position.x ?? 0);
  });

  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    order.push(current);

    for (const next of adjacency.get(current) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) {
        queue.push(next);
        queue.sort((a, b) => {
          const nodeA = nodes.find((node) => node.id === a);
          const nodeB = nodes.find((node) => node.id === b);
          return (nodeA?.position.x ?? 0) - (nodeB?.position.x ?? 0);
        });
      }
    }
  }

  if (order.length !== nodeIds.size) {
    const remaining = [...nodeIds].filter((id) => !order.includes(id));
    remaining.sort((a, b) => {
      const nodeA = nodes.find((node) => node.id === a);
      const nodeB = nodes.find((node) => node.id === b);
      return (nodeA?.position.x ?? 0) - (nodeB?.position.x ?? 0);
    });
    order.push(...remaining);
  }

  return order;
}

export type PipelineReadinessOptions = {
  /** When true, upstream nodes in the graph may run later in the same pipeline. */
  forFullRun?: boolean;
};

export function buildPipelineSteps(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  projectId: string,
  options?: PipelineReadinessOptions,
): PipelineStep[] {
  const order = topologicalSort(nodes, edges);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const chainNodeIds = options?.forFullRun
    ? new Set(nodes.map((node) => node.id))
    : undefined;

  return order.map((nodeId, index) => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      return {
        nodeId,
        label: nodeId,
        modelId: "",
        category: "",
        inputType: "",
        outputType: "",
        order: index + 1,
        upstreamLabel: null,
        wireLabel: null,
        hasOutput: false,
        ready: false,
        issues: ["Node not found"],
      };
    }

    const requiredInput = getModelWireKinds(
      node.data.modelId,
      node.data.inputType,
      node.data.outputType,
    ).input;
    const upstream = getUpstreamContext(nodeId, nodes, edges, requiredInput);
    const readiness = getNodeReadiness(
      node.data.modelId,
      node.data,
      upstream,
      projectId,
      chainNodeIds
        ? { deferUpstreamOutput: true, chainNodeIds }
        : undefined,
    );
    const upstreamNode = upstream.nodeId
      ? nodeMap.get(upstream.nodeId)
      : null;

    let wireLabel: string | null = null;
    if (upstreamNode) {
      wireLabel = `${upstreamNode.data.outputType} → ${node.data.inputType}`;
    }

    return {
      nodeId,
      label: node.data.label,
      modelId: node.data.modelId,
      category: node.data.category,
      inputType: node.data.inputType,
      outputType: node.data.outputType,
      order: index + 1,
      upstreamLabel: upstreamNode?.data.label ?? null,
      wireLabel,
      hasOutput: Boolean(node.data.cachedOutput),
      ready: readiness.ready,
      issues: readiness.issues,
    };
  });
}

export function getPipelineReadiness(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  projectId: string,
  options?: PipelineReadinessOptions,
): PipelineReadiness {
  if (nodes.length === 0) {
    return {
      ready: false,
      runnableCount: 0,
      issues: ["Add nodes to the canvas first"],
      steps: [],
    };
  }

  const steps = buildPipelineSteps(nodes, edges, projectId, options);
  const notReady = steps.filter((step) => !step.ready);

  return {
    ready: notReady.length === 0,
    runnableCount: steps.filter((step) => step.ready).length,
    issues: notReady.flatMap((step) =>
      step.issues.map((issue) => `${step.label}: ${issue}`),
    ),
    steps,
  };
}
