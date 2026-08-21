"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";

import { cropBboxFromBase64, type NormalizedBBox } from "@/lib/canvas/crop-region";
import { Button } from "@/components/ui/button";

type FormulaWire = {
  id?: string;
  latex?: string;
  inline?: boolean;
  bbox?: NormalizedBBox;
};

type FormulaPreviewProps = {
  formulas: FormulaWire[];
  pageImageBase64?: string;
};

function FormulaCrop({
  imageBase64,
  bbox,
  alt,
}: {
  imageBase64: string;
  bbox: NormalizedBBox;
  alt: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void cropBboxFromBase64(imageBase64, bbox).then((b64) => {
      if (!cancelled && b64) setSrc(b64);
    });
    return () => {
      cancelled = true;
    };
  }, [imageBase64, bbox]);

  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/png;base64,${src}`}
      alt={alt}
      className="h-16 w-full rounded-sm border border-border object-contain bg-secondary/30"
    />
  );
}

export function FormulaPreview({ formulas, pageImageBase64 }: FormulaPreviewProps) {
  if (!formulas.length) {
    return <p className="text-xs text-muted-foreground">No formulas</p>;
  }

  return (
    <div className="space-y-3">
      {formulas.map((formula, i) => (
        <div key={formula.id ?? i} className="space-y-1.5 rounded-sm border border-border p-2">
          {pageImageBase64 && formula.bbox && (
            <FormulaCrop
              imageBase64={pageImageBase64}
              bbox={formula.bbox}
              alt={formula.id ?? `formula-${i}`}
            />
          )}
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] text-muted-foreground">
              {formula.id ?? `formula-${i}`}
              {formula.inline ? " · inline" : ""}
            </p>
            {formula.latex && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5"
                aria-label={`Copy ${formula.id ?? `formula-${i}`} LaTeX`}
                onClick={() => void navigator.clipboard.writeText(formula.latex ?? "")}
              >
                <Copy className="size-3" />
              </Button>
            )}
          </div>
          {formula.latex ? (
            <pre className="overflow-x-auto rounded-sm bg-secondary/40 p-2 font-mono text-[11px] text-foreground/90">
              {formula.latex}
            </pre>
          ) : (
            <p className="text-[10px] text-muted-foreground">No LaTeX yet</p>
          )}
        </div>
      ))}
    </div>
  );
}
