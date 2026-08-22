import type { PipelineBoundaryResult } from "@/lib/canvas/pipeline-boundary";

const BOUNDARY_ERROR_LABELS: Record<string, string> = {
  no_nodes: "Add at least one model",
  no_entry_node: "Add a starting node with wire input",
  no_exit_node: "Add an ending node",
  incompatible_entry_inputs: "Starting nodes must accept the same input type",
  incompatible_exit_outputs: "Ending nodes must produce the same output type",
  incompatible_connection: "Fix incompatible connections between models",
  contains_file_loader: "File loaders cannot be used in pipelines",
  contains_page_branch: "Page branch nodes are not supported",
  cycle_detected: "Remove cycles from the graph",
  disconnected_graph: "Connect all nodes into one flow",
  invalid_entry_input: "Starting node must accept wire input (not file upload)",
  invalid_exit_output: "Ending node must produce wire output",
  invalid_graph: "Invalid pipeline graph",
};

export function formatBoundaryErrors(errors: string[]): string {
  return errors
    .map((error) => BOUNDARY_ERROR_LABELS[error] ?? error)
    .join(" · ");
}

export function getPipelineBoundaryStatusLabel(
  boundary: PipelineBoundaryResult | null,
): { tone: "draft" | "ready" | "invalid"; label: string } {
  if (!boundary || boundary.errors.includes("no_nodes")) {
    return { tone: "draft", label: "Draft" };
  }

  if (boundary.valid) {
    return {
      tone: "ready",
      label: `${boundary.inputLabel} → ${boundary.outputLabel}`,
    };
  }

  return {
    tone: "invalid",
    label: formatBoundaryErrors(boundary.errors),
  };
}
