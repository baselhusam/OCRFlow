"use client";

import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

type LogoHomeLinkProps = {
  href?: string;
  variant?: "lockup" | "mark";
  className?: string;
  logoClassName?: string;
  ringOffsetClassName?: string;
};

export function LogoHomeLink({
  href = "/app",
  variant = "lockup",
  className,
  logoClassName = "h-8 w-auto",
  ringOffsetClassName = "focus-visible:ring-offset-background",
}: LogoHomeLinkProps) {
  return (
    <Link
      href={href}
      aria-label="OCRFlow home"
      className={cn(
        "inline-flex transform-gpu rounded-sm outline-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[transform,opacity] hover:scale-[1.02] hover:opacity-85 active:scale-[0.99] active:opacity-70 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        ringOffsetClassName,
        className,
      )}
    >
      {variant === "mark" ? (
        <LogoMark className={logoClassName} />
      ) : (
        <LogoLockup className={logoClassName} priority />
      )}
    </Link>
  );
}
