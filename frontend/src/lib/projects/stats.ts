import type { Project } from "@/lib/api/client";
import { parsePipelineGraph } from "@/lib/canvas/graph-utils";

export type ProjectStats = {
  nodeCount: number;
  edgeCount: number;
  modelCount: number;
  fileCount: number;
  lastRunAt: string | null;
};

export type WorkspaceStats = {
  projectCount: number;
  totalNodes: number;
  totalEdges: number;
  uniqueModels: number;
  totalFiles: number;
  activePipelines: number;
  runsToday: number;
  lastActivityAt: string | null;
};

export function getProjectStats(project: Project): ProjectStats {
  const graph = parsePipelineGraph(project.graph);
  const assetIds = new Set<string>();
  const modelIds = new Set<string>();
  let lastRunAt: string | null = null;

  for (const node of graph.nodes) {
    modelIds.add(node.modelId);

    const assetId = node.config?.assetId;
    if (typeof assetId === "string" && assetId.length > 0) {
      assetIds.add(assetId);
    }

    const runAt = node.runtime?.lastRunAt;
    if (runAt && (!lastRunAt || runAt > lastRunAt)) {
      lastRunAt = runAt;
    }
  }

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    modelCount: modelIds.size,
    fileCount: assetIds.size,
    lastRunAt,
  };
}

export function formatProjectMeta(stats: ProjectStats): {
  nodes: string;
  models: string;
  files: string;
} {
  return {
    nodes: `${stats.nodeCount} node${stats.nodeCount === 1 ? "" : "s"}`,
    models: `${stats.modelCount} model${stats.modelCount === 1 ? "" : "s"}`,
    files: `${stats.fileCount} file${stats.fileCount === 1 ? "" : "s"}`,
  };
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function getWorkspaceStats(projects: Project[]): WorkspaceStats {
  const modelIds = new Set<string>();
  const assetIds = new Set<string>();
  let totalNodes = 0;
  let totalEdges = 0;
  let activePipelines = 0;
  let runsToday = 0;
  let lastActivityAt: string | null = null;

  for (const project of projects) {
    const stats = getProjectStats(project);
    totalNodes += stats.nodeCount;
    totalEdges += stats.edgeCount;
    activePipelines += stats.nodeCount > 0 ? 1 : 0;

    if (stats.lastRunAt) {
      if (isToday(stats.lastRunAt)) {
        runsToday += 1;
      }
      if (!lastActivityAt || stats.lastRunAt > lastActivityAt) {
        lastActivityAt = stats.lastRunAt;
      }
    }

    if (!lastActivityAt || project.updated_at > lastActivityAt) {
      lastActivityAt = project.updated_at;
    }

    const graph = parsePipelineGraph(project.graph);
    for (const node of graph.nodes) {
      modelIds.add(node.modelId);
      const assetId = node.config?.assetId;
      if (typeof assetId === "string" && assetId.length > 0) {
        assetIds.add(`${project.id}:${assetId}`);
      }
    }
  }

  return {
    projectCount: projects.length,
    totalNodes,
    totalEdges,
    uniqueModels: modelIds.size,
    totalFiles: assetIds.size,
    activePipelines,
    runsToday,
    lastActivityAt,
  };
}
