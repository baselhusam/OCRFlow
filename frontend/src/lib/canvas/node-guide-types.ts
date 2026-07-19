import type { ReactNode } from "react";

import type { PipelineNodeData } from "@/lib/canvas/types";

export type NodeGuideContext = {
  data: PipelineNodeData;
  categoryColor: string;
};

export type NodeGuideStep = {
  id: string;
  title: string;
  description: string;
  render: (ctx: NodeGuideContext) => ReactNode;
};

export type NodeGuideDefinition = {
  modelId: string;
  steps: NodeGuideStep[];
};
