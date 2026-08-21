"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

type DocsCopyCodeProps = {
  code: string;
  className?: string;
};

export function DocsCopyCode({ code, className }: DocsCopyCodeProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "absolute top-2.5 right-2.5 inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#c9c5da] transition-colors hover:border-primary/40 hover:text-white",
        className,
      )}
      aria-label={copied ? "Copied" : "Copy code"}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
