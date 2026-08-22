"use client";

import { ParamMultiSelect } from "@/components/canvas/node-detail/param-multi-select";
import { ParamSlider } from "@/components/canvas/param-slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ParamFieldDef } from "@/lib/canvas/node-param-schema";
import { isSliderParam } from "@/lib/canvas/node-param-schema";
import {
  displayToPageIndex,
  pageIndexToDisplay,
} from "@/lib/canvas/page-index-display";
import { cn } from "@/lib/utils";

type ParamFieldProps = {
  field: ParamFieldDef;
  value: string | boolean | number | undefined;
  onChange: (value: string | boolean | number) => void;
  maxOverride?: number;
  className?: string;
};

export function ParamField({
  field,
  value,
  onChange,
  maxOverride,
  className,
}: ParamFieldProps) {
  const inputId = `param-${field.key}`;
  const displayOffset = field.displayOffset ?? 0;
  const displayValue =
    value === undefined || value === ""
      ? ""
      : displayOffset > 0
        ? pageIndexToDisplay(Number(value))
        : value;
  const displayMin = field.min;
  const displayMax = maxOverride ?? field.max;
  const rangeHint =
    field.type === "number" && displayMin !== undefined && displayMax !== undefined
      ? `${displayMin}–${displayMax}`
      : null;

  const emitValue = (val: string | boolean | number) => {
    if (field.type === "number" && displayOffset > 0) {
      onChange(displayToPageIndex(Number(val)));
      return;
    }
    onChange(val);
  };

  if (field.type === "boolean") {
    return (
      <div className={cn("flex items-center justify-between gap-3", className)}>
        <Label htmlFor={inputId} className="text-[11px] font-normal text-muted-foreground">
          {field.label}
        </Label>
        <Switch
          id={inputId}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
          size="sm"
        />
      </div>
    );
  }

  if (field.type === "multi-select" && field.options?.length) {
    return (
      <ParamMultiSelect
        field={field}
        id={inputId}
        value={value}
        onChange={(val) => onChange(val)}
        className={className}
      />
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label htmlFor={inputId} className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase">
          {field.label}
        </Label>
        <Select
          value={String(value ?? field.options[0]?.value ?? "")}
          onValueChange={(val) => {
            if (val !== null) onChange(val);
          }}
        >
          <SelectTrigger id={inputId} className="h-8 w-full font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isSliderParam(field)) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={inputId} className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase">
            {field.label}
          </Label>
          {rangeHint && (
            <span className="font-mono text-[9px] text-muted-foreground/70">
              {rangeHint}
            </span>
          )}
        </div>
        <ParamSlider
          value={Number(value ?? field.min ?? 0)}
          min={field.min ?? 0}
          max={maxOverride ?? field.max ?? 1}
          step={field.step}
          onChange={(val) => onChange(val)}
          aria-label={field.label}
          id={inputId}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label
          htmlFor={inputId}
          className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase"
        >
          {field.label}
        </Label>
        <textarea
          id={inputId}
          rows={field.rows ?? 4}
          className="w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-2 font-mono text-xs leading-relaxed text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={String(displayValue ?? "")}
          onChange={(event) => emitValue(event.target.value)}
          spellCheck={field.key !== "json_schema"}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase">
          {field.label}
        </Label>
        {rangeHint && (
          <span className="font-mono text-[9px] text-muted-foreground/70">
            {rangeHint}
          </span>
        )}
      </div>
      <Input
        id={inputId}
        type={field.type === "number" ? "number" : "text"}
        min={displayMin}
        max={displayMax}
        step={field.step}
        className="h-8 font-mono text-xs"
        value={String(displayValue ?? "")}
        onChange={(e) => {
          const val =
            field.type === "number" ? Number(e.target.value) : e.target.value;
          emitValue(val);
        }}
      />
    </div>
  );
}
