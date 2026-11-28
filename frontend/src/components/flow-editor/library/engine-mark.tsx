"use client";

import Image from "next/image";
import { useState } from "react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { cn } from "@/lib/utils";

import { BUILTIN_ENGINE, engineForProvider } from "./library-data";

/**
 * Logos drawn on an always-white tile, so every entry uses its dark-ink asset
 * in both themes (ProviderLogo swaps/inverts for dark surfaces, which would
 * vanish on white).
 */
const TILE_LOGOS: Record<string, string> = {
  docling: "/models_logos/docling.png",
  surya: "/models_logos/surya_ocr_svg.svg",
  paddle: "/models_logos/paddle_ocr_logo.png",
  liquid: "/models_logos/liquid-ai-mark-black.svg",
  openai: "/models_logos/openai.svg",
  "openai-compatible": "/models_logos/openai.svg",
  anthropic: "/models_logos/claude.png",
  "anthropic-compatible": "/models_logos/claude.png",
  openrouter: "/models_logos/openrouter.png",
};

const MONOGRAMS: Record<string, string> = {
  ollama: "OL",
  unlimited: "UO",
};

type EngineMarkProps = {
  /** A model provider or an engine id (e.g. "ocrflow"). */
  provider: string;
  /** Tile edge in px. */
  size?: number;
  className?: string;
  dimmed?: boolean;
};

/** White rounded "app icon" tile carrying a provider's real logo. */
export function EngineMark({
  provider,
  size = 28,
  className,
  dimmed = false,
}: EngineMarkProps) {
  const [failed, setFailed] = useState(false);
  const engine = provider === BUILTIN_ENGINE ? provider : engineForProvider(provider);
  const src = TILE_LOGOS[provider];
  const inner = Math.round(size * 0.62);

  let content: React.ReactNode;
  if (src && !failed) {
    content = (
      <Image
        src={src}
        alt=""
        width={inner}
        height={inner}
        className="object-contain"
        style={{ width: inner, height: inner }}
        onError={() => setFailed(true)}
        aria-hidden
      />
    );
  } else if (engine === BUILTIN_ENGINE) {
    content = <SegmentMark size={inner} className="text-[#15131f]" />;
  } else {
    content = (
      <span
        className="font-mono font-semibold tracking-[0.02em] text-[#15131f]"
        style={{ fontSize: Math.max(8, Math.round(size * 0.32)) }}
        aria-hidden
      >
        {MONOGRAMS[provider] ?? provider.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-white",
        "shadow-[0_0_0_1px_rgba(20,18,37,0.08),0_1px_2px_rgba(20,18,37,0.06)]",
        "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)]",
        dimmed && "dark:bg-white/70",
        className,
      )}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      aria-hidden
    >
      <span
        className={cn(
          "inline-flex items-center justify-center transition-[filter,opacity]",
          dimmed && "opacity-45 grayscale",
        )}
      >
        {content}
      </span>
    </span>
  );
}
