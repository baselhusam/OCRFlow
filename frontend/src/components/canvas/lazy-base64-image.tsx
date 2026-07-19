"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type LazyBase64ImageProps = {
  base64: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
};

export function LazyBase64Image({ base64, alt, className, onLoad }: LazyBase64ImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("min-h-16", className)}>
      {visible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${base64}`}
          alt={alt}
          loading="lazy"
          className="h-16 w-full object-contain bg-secondary/30"
          onLoad={onLoad}
        />
      ) : (
        <div className="flex h-16 items-center justify-center bg-secondary/30 text-[10px] text-muted-foreground">
          …
        </div>
      )}
    </div>
  );
}
