"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  priority?: boolean;
};

export function LogoMark({ className, priority }: LogoMarkProps) {
  return (
    <Image
      src="/brand/mark.svg"
      alt=""
      width={120}
      height={120}
      priority={priority}
      aria-hidden
      className={cn("h-auto w-auto max-w-full", className)}
    />
  );
}
