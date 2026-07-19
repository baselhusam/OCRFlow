"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MiniNodeCardProps = {
  title: string;
  output?: string;
  active?: boolean;
  progress?: number;
  accentColor?: string;
  source?: boolean;
  ghost?: boolean;
  className?: string;
};

export function MiniNodeCard({
  title,
  output,
  active = false,
  progress,
  accentColor = "var(--primary)",
  source = false,
  ghost = false,
  className,
}: MiniNodeCardProps) {
  const borderColor = active ? accentColor : "var(--border)";
  const dotColor = active ? accentColor : "var(--muted-foreground)";

  return (
    <div
      className={cn(
        "relative min-w-[132px] rounded-[10px] border bg-card",
        ghost && "opacity-60",
        className,
      )}
      style={{
        borderColor,
        boxShadow: active
          ? `0 0 0 3px color-mix(in srgb, ${accentColor} 22%, transparent)`
          : undefined,
      }}
    >
      {!source && (
        <span
          aria-hidden
          className="absolute top-1/2 -left-1.5 size-2 -translate-y-1/2 rounded-full border-2 border-card"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span
          className="size-2 shrink-0"
          style={{
            borderRadius: active ? "50%" : "2px",
            backgroundColor: dotColor,
          }}
          aria-hidden
        />
        <span className="truncate text-[12px] font-semibold text-foreground">
          {title}
        </span>
      </div>
      {output && (
        <div className="px-3 py-2 text-left font-mono text-[10px] text-muted-foreground">
          {output}
          {active && progress !== undefined && (
            <>
              {" "}
              <span style={{ color: accentColor }}>{progress}%</span>
            </>
          )}
        </div>
      )}
      {active && progress !== undefined && (
        <div className="h-[3px] overflow-hidden rounded-b-[9px] bg-border">
          <span
            className="block h-[3px] animate-[ocrflow-node-progress_1.4s_ease-in-out_infinite]"
            style={{
              width: `${progress}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      )}
      <span
        aria-hidden
        className="absolute top-1/2 -right-1.5 size-2 -translate-y-1/2 rounded-full border-2 border-card"
        style={{ backgroundColor: active ? accentColor : "var(--muted-foreground)" }}
      />
    </div>
  );
}

type FlowConnectorProps = {
  animated?: boolean;
  accentColor?: string;
  className?: string;
};

export function FlowConnector({
  animated = false,
  accentColor = "var(--primary)",
  className,
}: FlowConnectorProps) {
  const stroke = animated ? accentColor : "var(--border)";

  return (
    <svg
      width="38"
      height="14"
      viewBox="0 0 38 14"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path
        d="M0 7h30"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray={animated ? "4 4" : undefined}
        className={animated ? "ocrflow-animate-dash" : undefined}
      />
      <path
        d="M28 2l6 5-6 5"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StepSceneProps = {
  children: ReactNode;
  accentColor?: string;
  className?: string;
};

export function StepScene({
  children,
  accentColor = "var(--primary)",
  className,
}: StepSceneProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-border p-5",
        className,
      )}
      style={{
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${accentColor} 10%, var(--card)) 0%, var(--card) 70%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--foreground) 12%, transparent) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}

type GuideParamFieldProps = {
  label: string;
  value: string | number;
  hint?: string;
  accentColor?: string;
  highlighted?: boolean;
};

export function GuideParamField({
  label,
  value,
  hint,
  accentColor = "var(--primary)",
  highlighted = false,
}: GuideParamFieldProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/80 px-3 py-2.5 transition-shadow",
        highlighted && "ring-2",
      )}
      style={
        highlighted
          ? {
              boxShadow: `0 0 0 3px color-mix(in srgb, ${accentColor} 18%, transparent)`,
            }
          : undefined
      }
    >
      <p className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

type GuideWireBadgeProps = {
  label: string;
  accentColor?: string;
};

export function GuideWireBadge({
  label,
  accentColor = "var(--primary)",
}: GuideWireBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 font-mono text-[10px] font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${accentColor} 14%, var(--card))`,
        color: accentColor,
      }}
    >
      {label}
    </span>
  );
}
