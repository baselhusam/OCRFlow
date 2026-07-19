"use client";

import Image from "next/image";
import { useTheme } from "@/components/providers/theme-provider";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type LogoLockupProps = {
  className?: string;
  priority?: boolean;
};

export function LogoLockup({ className, priority }: LogoLockupProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Image
      src={isDark ? "/brand/logo-lockup.svg" : "/brand/logo-lockup-light.svg"}
      alt="OCRFlow"
      width={430}
      height={120}
      priority={priority}
      className={cn("h-auto w-auto max-w-full", className)}
    />
  );
}
