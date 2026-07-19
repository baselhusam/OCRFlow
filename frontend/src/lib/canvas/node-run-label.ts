export function getNodeRunLabel(
  _category: string,
  runStatus: "idle" | "running" | "success" | "error" | undefined,
): string {
  if (runStatus === "running") return "Running...";
  return "Run";
}

export function getNodeRunTooltip(_category: string): string {
  return "Run this node";
}
