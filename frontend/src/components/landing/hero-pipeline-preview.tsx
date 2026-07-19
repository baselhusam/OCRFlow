"use client";

type HeroPipelineNodeProps = {
  title: string;
  output: string;
  active?: boolean;
  progress?: number;
};

function HeroPipelineNode({
  title,
  output,
  active = false,
  progress,
}: HeroPipelineNodeProps) {
  return (
    <div
      className="min-w-[148px] rounded-[10px] border bg-[var(--landing-node-bg)]"
      style={{
        borderColor: active ? "var(--accent)" : "var(--landing-node-border)",
        boxShadow: active ? "0 0 0 4px var(--landing-ring)" : undefined,
      }}
    >
      <div className="flex items-center gap-[9px] border-b border-[var(--landing-node-border)] px-[14px] py-[11px]">
        <span
          className="h-2 w-2 shrink-0"
          style={{
            borderRadius: active ? "50%" : "2px",
            background: active ? "var(--accent)" : "var(--muted-foreground)",
          }}
        />
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-[14px] py-[9px] text-left font-mono text-[11px] text-muted-foreground">
        {output}
        {active && progress !== undefined && (
          <>
            {" "}
            <span className="text-primary">{progress}%</span>
          </>
        )}
      </div>
      {active && progress !== undefined && (
        <div className="h-[3px] overflow-hidden rounded-b-[9px] bg-[var(--landing-node-border)]">
          <span
            className="block h-[3px] bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PipelineConnector({ animated = false }: { animated?: boolean }) {
  return (
    <svg
      width="38"
      height="14"
      viewBox="0 0 38 14"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M0 7h30"
        stroke={animated ? "var(--accent)" : "var(--landing-node-border)"}
        strokeWidth="2"
        strokeDasharray={animated ? "4 4" : undefined}
        className={animated ? "ocrflow-animate-dash" : undefined}
      />
      <path
        d="M28 2l6 5-6 5"
        stroke={animated ? "var(--accent)" : "var(--landing-node-border)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroPipelinePreview() {
  return (
    <div className="mt-[46px] flex flex-wrap items-center justify-center gap-[14px]">
      <HeroPipelineNode title="Detect Layout" output="→ regions[]" />
      <PipelineConnector animated />
      <HeroPipelineNode
        title="Recognize Text"
        output="running…"
        active
        progress={64}
      />
      <PipelineConnector />
      <HeroPipelineNode title="Extract Data" output="→ json" />
    </div>
  );
}
