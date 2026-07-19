"use client";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { cn } from "@/lib/utils";

type PortVariant = "active" | "empty" | "warn";

type ConnectionPortProps = {
  direction: "in" | "out";
  wireType?: string;
  variant?: PortVariant;
  emptyLabel?: string;
};

function ConnectionPort({
  direction,
  wireType,
  variant = "active",
  emptyLabel = "No input",
}: ConnectionPortProps) {
  const isIn = direction === "in";
  const label =
    variant === "empty" ? emptyLabel : formatWireLabel(wireType ?? "unknown");

  return (
    <div className="flex min-w-[92px] max-w-[112px] flex-1 flex-col items-center">
      <div
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-center transition-colors",
          variant === "empty" &&
            "border-dashed border-border/70 bg-muted/25 text-muted-foreground",
          variant === "active" && "border-border/60 bg-card shadow-sm",
          variant === "warn" &&
            "border-destructive/35 bg-destructive/5 text-destructive",
        )}
      >
        <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
          {isIn ? "In" : "Out"}
        </p>
        <p
          className={cn(
            "mt-1 text-[13px] leading-tight font-semibold",
            variant === "empty" && "text-muted-foreground",
            variant === "active" && "text-foreground",
            variant === "warn" && "text-destructive",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function ConnectionWire({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex min-w-[20px] flex-1 items-center px-0.5">
      <div
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accentColor} 35%, var(--border)), transparent)`,
        }}
      />
      <span
        className="size-2.5 shrink-0 rounded-full border-2 bg-card"
        style={{ borderColor: accentColor }}
        aria-hidden
      />
    </div>
  );
}

type NodeConnectionDiagramProps = {
  provider: string;
  categoryColor: string;
  inputType?: string;
  outputType: string;
  hasInput?: boolean;
  inputVariant?: PortVariant;
};

export function NodeConnectionDiagram({
  provider,
  categoryColor,
  inputType,
  outputType,
  hasInput = true,
  inputVariant = "active",
}: NodeConnectionDiagramProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--muted)_42%,var(--card))_0%,var(--card)_100%)] px-3 py-5">
      <div className="flex items-center justify-center gap-0">
        {hasInput ? (
          <>
            <ConnectionPort
              direction="in"
              wireType={inputType}
              variant={inputVariant}
            />
            <ConnectionWire accentColor={categoryColor} />
          </>
        ) : (
          <>
            <ConnectionPort direction="in" variant="empty" />
            <ConnectionWire accentColor={categoryColor} />
          </>
        )}

        <div
          className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border-2 bg-card shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--foreground)_18%,transparent)]"
          style={{
            borderColor: `color-mix(in srgb, ${categoryColor} 55%, var(--border))`,
            boxShadow: `0 0 0 4px color-mix(in srgb, ${categoryColor} 10%, transparent), 0 8px 20px -12px color-mix(in srgb, var(--foreground) 18%, transparent)`,
          }}
          aria-hidden
        >
          <ProviderLogo provider={provider} size={22} />
        </div>

        <ConnectionWire accentColor={categoryColor} />
        <ConnectionPort direction="out" wireType={outputType} variant="active" />
      </div>
    </div>
  );
}
