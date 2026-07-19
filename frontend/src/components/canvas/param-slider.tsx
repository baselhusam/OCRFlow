"use client";

import { cn } from "@/lib/utils";

type ParamSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
};

export function ParamSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
}: ParamSliderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-foreground/80 tabular-nums">
        {step < 1 ? value.toFixed(2) : value}
      </span>
    </div>
  );
}
