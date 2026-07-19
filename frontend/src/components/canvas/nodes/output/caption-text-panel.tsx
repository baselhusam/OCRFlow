"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

import { ItemOutputHandle } from "@/components/canvas/nodes/output/item-output-handle";
import { cn } from "@/lib/utils";

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.03, duration: 0.2 },
  }),
};

const documentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

const NODE_SCROLL_AREA = "nowheel nodrag nopan overflow-y-auto overscroll-contain";

export type CaptionLineWire = {
  id: string;
  text?: string | null;
};

type CaptionTextPanelProps = {
  lines: CaptionLineWire[];
  showConnectionPorts?: boolean;
  /** Unified prose block for expanded branch view; list rows for compact inline output. */
  variant?: "list" | "unified";
  /** When true, render caption text as Markdown (unified variant only). */
  renderAsMarkdown?: boolean;
  className?: string;
  emptyMessage?: string;
};

function formatCaptionDocument(lines: CaptionLineWire[]): string {
  return lines
    .map((line) => line.text?.trim() || line.id)
    .filter(Boolean)
    .join("\n\n");
}

export function CaptionTextPanel({
  lines,
  showConnectionPorts = false,
  variant = "list",
  renderAsMarkdown = false,
  className,
  emptyMessage = "Run the parent caption node to preview generated text.",
}: CaptionTextPanelProps) {
  if (!lines.length) {
    return (
      <p className="flex h-full items-center justify-center px-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  if (variant === "unified") {
    const documentText = formatCaptionDocument(lines);

    return (
      <div className={cn(NODE_SCROLL_AREA, "h-full", className)}>
        <motion.div
          variants={documentVariants}
          initial="hidden"
          animate="visible"
          className="ocrflow-caption-text-document ocrflow-output-glass-card nodrag nopan h-full min-h-0 rounded-lg px-3 py-2.5"
        >
          {renderAsMarkdown ? (
            <div className="ocrflow-caption-markdown text-[11px] leading-[1.65] text-foreground/90">
              <ReactMarkdown>{documentText}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[11px] leading-[1.65] text-foreground/90">
              {documentText}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(NODE_SCROLL_AREA, "h-full space-y-1.5 px-2 py-1", className)}>
      {lines.map((line, index) => (
        <motion.div
          key={line.id}
          custom={index}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="relative flex items-start gap-0.5"
        >
          <p
            className="ocrflow-output-glass-card nodrag nopan min-w-0 flex-1 whitespace-pre-wrap rounded-lg px-2 py-1.5 text-[10px] leading-relaxed text-foreground/85"
            title={line.text ?? line.id}
          >
            {line.text?.trim() || line.id}
          </p>
          {showConnectionPorts && (
            <ItemOutputHandle itemKind="line" itemId={line.id} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
