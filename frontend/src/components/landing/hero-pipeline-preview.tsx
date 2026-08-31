"use client";

import {
  Braces,
  LayoutTemplate,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";

type HeroPipelineNodeProps = {
  title: string;
  output: string;
  index: number;
  icon: LucideIcon;
  active?: boolean;
  progress?: number;
};

function HeroPipelineNode({
  title,
  output,
  index,
  icon: Icon,
  active = false,
  progress,
}: HeroPipelineNodeProps) {
  return (
    <div
      className="group relative w-full min-w-[168px] overflow-hidden rounded-xl border bg-[var(--landing-node-bg)] text-left shadow-[0_10px_24px_-20px_rgba(20,18,37,0.55)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: active ? "var(--accent)" : "var(--landing-node-border)",
        boxShadow: active
          ? "0 0 0 3px var(--landing-ring), 0 16px 30px -24px color-mix(in srgb, var(--accent) 70%, transparent)"
          : undefined,
      }}
    >
      <div className="flex items-center justify-between px-3.5 pt-3">
        <span
          className="grid size-7 place-items-center rounded-lg"
          style={{
            background: active
              ? "color-mix(in srgb, var(--accent) 13%, transparent)"
              : "var(--secondary)",
            color: active ? "var(--accent)" : "var(--muted-foreground)",
          }}
        >
          <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="font-mono text-[9px] tracking-[0.13em] text-muted-foreground">
          0{index}
        </span>
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <p className="text-[14px] font-semibold tracking-[-0.015em] text-foreground">
          {title}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="truncate">{output}</span>
          {active && progress !== undefined ? (
            <span className="shrink-0 font-medium text-primary">{progress}%</span>
          ) : (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/55" />
          )}
        </div>
      </div>
      {active && progress !== undefined && (
        <div className="h-1 overflow-hidden bg-primary/10">
          <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function PipelineConnector({ animated = false }: { animated?: boolean }) {
  return (
    <svg
      width="42"
      height="18"
      viewBox="0 0 42 18"
      fill="none"
      aria-hidden
      className="hidden shrink-0 sm:block"
    >
      <path
        d="M1 9h32"
        stroke={animated ? "var(--accent)" : "var(--landing-node-border)"}
        strokeWidth="1.5"
        strokeDasharray={animated ? "4 4" : undefined}
        className={animated ? "ocrflow-animate-dash" : undefined}
      />
      <path
        d="M31 4l6 5-6 5"
        stroke={animated ? "var(--accent)" : "var(--landing-node-border)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroPipelinePreview() {
  return (
    <div className="mx-auto mt-11 flex w-full max-w-[650px] flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-0">
      <HeroPipelineNode
        title="Detect Layout"
        output="→ regions[]"
        index={1}
        icon={LayoutTemplate}
      />
      <PipelineConnector animated />
      <HeroPipelineNode
        title="Recognize Text"
        output="running…"
        index={2}
        icon={ScanSearch}
        active
        progress={64}
      />
      <PipelineConnector />
      <HeroPipelineNode
        title="Extract Data"
        output="→ json"
        index={3}
        icon={Braces}
      />
    </div>
  );
}
