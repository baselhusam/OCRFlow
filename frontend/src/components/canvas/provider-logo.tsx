"use client";

import Image from "next/image";
import { useState } from "react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { cn } from "@/lib/utils";

const PROVIDER_LOGOS: Record<string, string | undefined> = {
  docling: "/models_logos/docling.png",
  surya: "/models_logos/surya_ocr_svg.svg",
  paddle: "/models_logos/paddle_ocr_logo.png",
};

/** Native OCRFlow pipeline providers (loaders, export, transforms, etc.). */
const OCRFLOW_PLATFORM_PROVIDERS = new Set([
  "loader",
  "export",
  "transform",
  "assembler",
  "llm",
  "vlm",
  "ocrflow",
]);

const PROVIDER_MONOGRAMS: Record<string, string> = {
  docling: "DL",
  surya: "SY",
  paddle: "PD",
  ibm: "IBM",
  loader: "LD",
  export: "EX",
  assembler: "AS",
  transform: "TR",
  llm: "LLM",
};

function isOcrflowPlatformProvider(provider: string): boolean {
  return OCRFLOW_PLATFORM_PROVIDERS.has(provider);
}

type ProviderStatus = "online" | "offline";

type ProviderLogoProps = {
  provider: string;
  size?: number;
  className?: string;
  /** When set, overlays a small runtime status dot on the logo. */
  status?: ProviderStatus;
};

function StatusDot({ status }: { status: ProviderStatus }) {
  return (
    <span
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-card",
        status === "online"
          ? "bg-[var(--status-ok)]"
          : "bg-[var(--status-warn)]",
      )}
      aria-hidden
    />
  );
}

export function ProviderLogo({
  provider,
  size = 18,
  className,
  status,
}: ProviderLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = PROVIDER_LOGOS[provider];
  // Surya's source mark is pure black. In dark UI surfaces, invert it so the
  // actual logo remains visible without changing the brand asset itself.
  const themeClass = provider === "surya" ? "dark:invert" : undefined;
  const monogram =
    PROVIDER_MONOGRAMS[provider] ??
    provider.slice(0, 2).toUpperCase();

  const inner = (() => {
    if (!src || failed) {
      if (isOcrflowPlatformProvider(provider)) {
        return (
          <SegmentMark
            size={size}
            className={cn("text-foreground", className)}
          />
        );
      }

      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center font-mono text-[9px] font-medium tracking-[0.08em] text-muted-foreground uppercase",
            className,
          )}
          style={{ width: size, height: size }}
          aria-hidden
        >
          {monogram}
        </span>
      );
    }

    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", themeClass, className)}
        style={{ width: size, height: "auto" }}
        onError={() => setFailed(true)}
        aria-hidden
      />
    );
  })();

  if (!status) {
    return inner;
  }

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {inner}
      <StatusDot status={status} />
    </span>
  );
}
