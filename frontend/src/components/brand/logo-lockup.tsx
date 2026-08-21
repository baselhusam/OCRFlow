"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoLockupProps = {
  className?: string;
  priority?: boolean;
};

export function LogoLockup({ className, priority }: LogoLockupProps) {
  return (
    <>
      <Image
        src="/brand/logo-lockup-light.svg"
        alt="OCRFlow"
        width={430}
        height={120}
        priority={priority}
        loading={priority ? "eager" : undefined}
        className={cn("h-auto w-auto max-w-full dark:hidden", className)}
      />
      <Image
        src="/brand/logo-lockup.svg"
        alt=""
        width={430}
        height={120}
        aria-hidden
        className={cn("hidden h-auto w-auto max-w-full dark:block", className)}
      />
    </>
  );
}
