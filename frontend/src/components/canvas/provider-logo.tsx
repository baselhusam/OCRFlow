"use client";

import Image from "next/image";
import { useState } from "react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { cn } from "@/lib/utils";

const PROVIDER_LOGOS: Record<string, string | undefined> = {
  docling: "/models_logos/docling.png",
  surya: "/models_logos/surya_ocr_svg.svg",
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

type ProviderLogoProps = {
  provider: string;
  size?: number;
  className?: string;
};

export function ProviderLogo({
  provider,
  size = 18,
  className,
}: ProviderLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = PROVIDER_LOGOS[provider];
  const monogram =
    PROVIDER_MONOGRAMS[provider] ??
    provider.slice(0, 2).toUpperCase();

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
          "inline-flex shrink-0 items-center justify-center font-mono text-[9px] font-medium tracking-wide text-muted-foreground uppercase",
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
      className={cn("shrink-0 object-contain", className)}
      onError={() => setFailed(true)}
      aria-hidden
    />
  );
}
