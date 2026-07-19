import type {
  ModelCatalogEntry,
  PipelineEdgeRecord,
  PipelineNodeRecord,
} from "@/lib/canvas/types";
import {
  BLOCKED_PIPELINE_MODELS,
  areWireKindsCompatible,
  getModelWireKinds,
  getModelWireLabels,
  type WireKind,
} from "@/lib/canvas/wire-types";

export type PipelineBoundaryResult = {
  valid: boolean;
  errors: string[];
  entryNodeIds: string[];
  exitNodeIds: string[];
  inputWireKind: WireKind;
  outputWireKind: WireKind;
  inputLabel: string;
  outputLabel: string;
};

function hasCycle(
  nodeIds: Set<string>,
  edges: PipelineEdgeRecord[],
): boolean {
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
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    visited += 1;
    for (const next of adjacency.get(current) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }

  return visited !== nodeIds.size;
}

function connectedComponents(
  nodeIds: Set<string>,
  edges: PipelineEdgeRecord[],
): number {
  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) adjacency.set(id, new Set());
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  let count = 0;

  for (const start of nodeIds) {
    if (visited.has(start)) continue;
    count += 1;
    const stack = [start];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
  }

  return count;
}

function validateEdgeCompatibility(
  nodes: PipelineNodeRecord[],
  edges: PipelineEdgeRecord[],
  nodeIds: Set<string>,
): boolean {
  const modelById = new Map(nodes.map((node) => [node.id, node.modelId]));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const sourceModel = modelById.get(edge.source) ?? "";
    const targetModel = modelById.get(edge.target) ?? "";
    const sourceWires = getModelWireKinds(sourceModel, "", "");
    const targetWires = getModelWireKinds(targetModel, "", "");
    if (!areWireKindsCompatible(sourceWires.output, targetWires.input)) {
      return false;
    }
  }

  return true;
}

export function derivePipelineBoundaryIO(
  nodes: PipelineNodeRecord[],
  edges: PipelineEdgeRecord[],
  _modelMap?: Map<string, ModelCatalogEntry>,
): PipelineBoundaryResult {
  const errors: string[] = [];
  const empty: PipelineBoundaryResult = {
    valid: false,
    errors: ["no_nodes"],
    entryNodeIds: [],
    exitNodeIds: [],
    inputWireKind: "none",
    outputWireKind: "none",
    inputLabel: "",
    outputLabel: "",
  };

  if (nodes.length === 0) return empty;

  if (nodes.length < 2) errors.push("insufficient_nodes");

  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    if (BLOCKED_PIPELINE_MODELS.has(node.modelId)) {
      if (node.modelId === "loader/pdf" || node.modelId === "loader/image") {
        errors.push("contains_file_loader");
      } else {
        errors.push("contains_page_branch");
      }
    }
  }

  if (hasCycle(nodeIds, edges)) errors.push("cycle_detected");
  if (connectedComponents(nodeIds, edges) > 1) errors.push("disconnected_graph");
  if (!validateEdgeCompatibility(nodes, edges, nodeIds)) {
    errors.push("incompatible_connection");
  }

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outDegree.set(id, 0);
  }
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const entryNodeIds = [...nodeIds].filter((id) => (inDegree.get(id) ?? 0) === 0);
  const exitNodeIds = [...nodeIds].filter((id) => (outDegree.get(id) ?? 0) === 0);

  if (entryNodeIds.length === 0) errors.push("no_entry_node");
  if (exitNodeIds.length === 0) errors.push("no_exit_node");

  const entryInputKinds = new Set<WireKind>();
  const exitOutputKinds = new Set<WireKind>();

  for (const entryId of entryNodeIds) {
    const entryNode = nodes.find((node) => node.id === entryId);
    if (!entryNode) continue;
    const entryWires = getModelWireKinds(entryNode.modelId, "", "");
    if (entryWires.input === "none" || entryWires.input === "file") {
      errors.push("invalid_entry_input");
    } else {
      entryInputKinds.add(entryWires.input);
    }
  }

  for (const exitId of exitNodeIds) {
    const exitNode = nodes.find((node) => node.id === exitId);
    if (!exitNode) continue;
    const exitWires = getModelWireKinds(exitNode.modelId, "", "");
    if (exitWires.output === "none") {
      errors.push("invalid_exit_output");
    } else {
      exitOutputKinds.add(exitWires.output);
    }
  }

  if (entryInputKinds.size > 1) errors.push("incompatible_entry_inputs");
  if (exitOutputKinds.size > 1) errors.push("incompatible_exit_outputs");

  if (errors.length > 0) {
    const primaryEntry = nodes.find((node) => node.id === entryNodeIds[0]);
    const primaryExit = nodes.find((node) => node.id === exitNodeIds[0]);
    const entryWires = primaryEntry
      ? getModelWireKinds(primaryEntry.modelId, "", "")
      : { input: "none" as WireKind, output: "none" as WireKind };
    const exitWires = primaryExit
      ? getModelWireKinds(primaryExit.modelId, "", "")
      : { input: "none" as WireKind, output: "none" as WireKind };
    const entryLabels = primaryEntry
      ? getModelWireLabels(
          primaryEntry.modelId,
          "",
          "",
          _modelMap?.get(primaryEntry.modelId)?.category,
        )
      : { input: "", output: "" };
    const exitLabels = primaryExit
      ? getModelWireLabels(
          primaryExit.modelId,
          "",
          "",
          _modelMap?.get(primaryExit.modelId)?.category,
        )
      : { input: "", output: "" };

    return {
      valid: false,
      errors,
      entryNodeIds,
      exitNodeIds,
      inputWireKind: entryWires.input,
      outputWireKind: exitWires.output,
      inputLabel: entryLabels.input,
      outputLabel: exitLabels.output,
    };
  }

  const entryNode = nodes.find((n) => n.id === entryNodeIds[0]);
  const exitNode = nodes.find((n) => n.id === exitNodeIds[0]);
  if (!entryNode || !exitNode) {
    return { ...empty, errors: ["invalid_graph"] };
  }

  const entryCategory = _modelMap?.get(entryNode.modelId)?.category;
  const exitCategory = _modelMap?.get(exitNode.modelId)?.category;
  const entryWires = getModelWireKinds(entryNode.modelId, "", "");
  const exitWires = getModelWireKinds(exitNode.modelId, "", "");
  const entryLabels = getModelWireLabels(
    entryNode.modelId,
    "",
    "",
    entryCategory,
  );
  const exitLabels = getModelWireLabels(
    exitNode.modelId,
    "",
    "",
    exitCategory,
  );

  return {
    valid: true,
    errors: [],
    entryNodeIds,
    exitNodeIds,
    inputWireKind: entryWires.input,
    outputWireKind: exitWires.output,
    inputLabel: entryLabels.input,
    outputLabel: exitLabels.output,
  };
}
