"use client";

import { useLayoutEffect } from "react";
import { useNodeId, useUpdateNodeInternals } from "@xyflow/react";

/** Tell React Flow to re-measure handles after output rows mount or resize. */
export function useRefreshNodeHandles(...deps: unknown[]) {
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();

  useLayoutEffect(() => {
    if (!nodeId) return;
    const raf = requestAnimationFrame(() => {
      updateNodeInternals(nodeId);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit dependency list from caller
  }, [nodeId, updateNodeInternals, ...deps]);
}
