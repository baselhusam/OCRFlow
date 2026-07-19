import type { PipelineEdgeRecord, PipelineNodeRecord } from "@/lib/canvas/types";

function compareRecordsByCanvasPosition(
  nodes: PipelineNodeRecord[],
  left: string,
  right: string,
): number {
  const nodeA = nodes.find((n) => n.id === left);
  const nodeB = nodes.find((n) => n.id === right);
  const xDiff = (nodeA?.position.x ?? 0) - (nodeB?.position.x ?? 0);
  if (xDiff !== 0) return xDiff;
  const yDiff = (nodeA?.position.y ?? 0) - (nodeB?.position.y ?? 0);
  if (yDiff !== 0) return yDiff;
  return left.localeCompare(right);
}

/** Topological sort for persisted pipeline node records. */
export function topologicalSortFromRecords(
  nodes: PipelineNodeRecord[],
  edges: PipelineEdgeRecord[],
): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
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

  const queue = [...nodeIds]
    .filter((id) => (inDegree.get(id) ?? 0) === 0)
    .sort((a, b) => compareRecordsByCanvasPosition(nodes, a, b));

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
        queue.sort((a, b) => compareRecordsByCanvasPosition(nodes, a, b));
      }
    }
  }

  if (order.length !== nodeIds.size) {
    const remaining = [...nodeIds]
      .filter((id) => !order.includes(id))
      .sort((a, b) => compareRecordsByCanvasPosition(nodes, a, b));
    order.push(...remaining);
  }

  return order;
}
