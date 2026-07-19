"use client";

import { motion } from "framer-motion";

import { ItemOutputHandle } from "@/components/canvas/nodes/output/item-output-handle";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import { formatClassificationLabel } from "@/lib/canvas/figure-classification-meta";
import { cn } from "@/lib/utils";

const NODE_SCROLL_AREA =
  "ocrflow-node-output-scroll nowheel nodrag nopan min-h-0 overflow-y-auto overscroll-contain";

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.04,
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export type ClassifiedFigureWire = {
  id: string;
  category?: string | null;
  caption?: string | null;
  description?: string | null;
  bbox?: number[];
};

type ClassificationResultsPanelProps = {
  figures: ClassifiedFigureWire[];
  showConnectionPorts?: boolean;
  className?: string;
};

export function ClassificationResultsPanel({
  figures,
  showConnectionPorts = true,
  className,
}: ClassificationResultsPanelProps) {
  useRefreshNodeHandles(
    true,
    figures.length,
    showConnectionPorts,
    figures.map((figure) => figure.category).join("|"),
  );

  return (
    <div
      className={cn(
        "ocrflow-pipeline-node-output ocrflow-classification-results-panel nodrag nopan flex w-[220px] min-w-[220px] flex-col",
        showConnectionPorts && figures.length > 0 && "has-figure-ports",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/30 px-2.5 py-2">
        <span className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground/80 uppercase">
          Classification Results
        </span>
        {figures.length > 0 && (
          <span className="font-mono text-[9px] text-muted-foreground/70">
            {figures.length}
          </span>
        )}
      </div>

      <div className={cn(NODE_SCROLL_AREA, "max-h-[320px] px-2 py-2")}>
        {figures.length === 0 ? (
          <p className="px-1 py-4 text-center text-[10px] leading-relaxed text-muted-foreground">
            Run this node to see classification results.
          </p>
        ) : (
          <div className="space-y-1.5">
            {figures.map((figure, index) => {
              const category = figure.category?.trim();
              const label = category
                ? formatClassificationLabel(category)
                : "Unclassified";

              return (
                <motion.div
                  key={figure.id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-0.5"
                >
                  <div className="ocrflow-output-glass-card nodrag nopan min-w-0 flex-1 rounded-lg px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[9px] text-muted-foreground">
                          {figure.id}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold leading-snug text-foreground">
                          {label}
                        </p>
                      </div>
                      {category && (
                        <span className="shrink-0 rounded-md border border-[var(--node-figure-classification)]/30 bg-[var(--node-figure-classification)]/10 px-1.5 py-0.5 font-mono text-[8px] tracking-wide text-[var(--node-figure-classification)] uppercase">
                          {category}
                        </span>
                      )}
                    </div>
                  </div>
                  {showConnectionPorts && (
                    <ItemOutputHandle itemKind="figure" itemId={figure.id} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
