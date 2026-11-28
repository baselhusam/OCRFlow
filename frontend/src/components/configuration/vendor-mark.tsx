"use client";

import Image from "next/image";
import { useState } from "react";

import { vendorKey, vendorLabel, vendorLogo } from "@/lib/openrouter-vendors";
import { cn } from "@/lib/utils";

/** Monogram tint per vendor, stable across renders. */
const TINTS = ["#5b2eef", "#0e9f6e", "#d97706", "#2563eb", "#db2777", "#0891b2", "#7c3aed", "#65a30d"];

function tint(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

type VendorMarkProps = {
  /** An OpenRouter model id ("qwen/…") or a vendor key ("qwen"). */
  vendor: string;
  size?: number;
  className?: string;
  dimmed?: boolean;
};

/** White rounded tile with the model vendor's logo (or a tinted monogram). */
export function VendorMark({ vendor, size = 28, className, dimmed = false }: VendorMarkProps) {
  const [failed, setFailed] = useState(false);
  const key = vendor.includes("/") ? vendorKey(vendor) : vendor;
  const src = vendorLogo(key);
  const inner = Math.round(size * 0.6);
  const label = vendorLabel(key);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-white",
        "shadow-[0_0_0_1px_rgba(20,18,37,0.08),0_1px_2px_rgba(20,18,37,0.06)]",
        "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)]",
        className,
      )}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      title={label}
      aria-hidden
    >
      <span className={cn("inline-flex items-center justify-center", dimmed && "opacity-45 grayscale")}>
        {src && !failed ? (
          <Image
            src={src}
            alt=""
            width={inner}
            height={inner}
            unoptimized
            className="object-contain"
            style={{ width: inner, height: inner }}
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className="font-mono font-semibold"
            style={{ color: tint(key), fontSize: Math.max(8, Math.round(size * 0.34)) }}
          >
            {label.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}
