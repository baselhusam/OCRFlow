"use client";

type TableCell = {
  row?: number;
  col?: number;
  text?: string;
  bbox?: number[];
};

type TableWire = {
  id?: string;
  rows?: number;
  cols?: number;
  html?: string;
  cells?: TableCell[];
  bbox?: number[];
};

type TablePreviewProps = {
  tables: TableWire[];
  pageImageBase64?: string;
};

export function TablePreview({ tables, pageImageBase64 }: TablePreviewProps) {
  if (!tables.length) {
    return <p className="text-xs text-muted-foreground">No tables</p>;
  }

  return (
    <div className="space-y-3">
      {pageImageBase64 && (
        <div className="relative overflow-hidden rounded-sm border border-border bg-secondary/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pageImageBase64}`}
            alt="Tables"
            className="w-full object-contain"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            {tables.map((table, i) => {
              const bbox = table.bbox;
              if (!bbox || bbox.length !== 4) return null;
              const [x0, y0, x1, y1] = bbox;
              return (
                <rect
                  key={table.id ?? i}
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  fill="color-mix(in srgb, var(--primary) 12%, transparent)"
                  stroke="var(--primary)"
                  strokeWidth={0.003}
                />
              );
            })}
          </svg>
        </div>
      )}

      {tables.map((table, i) => (
        <div key={table.id ?? i} className="space-y-2">
          <p className="font-mono text-[10px] text-muted-foreground">
            {table.id ?? `table-${i}`}
            {table.rows !== undefined && table.cols !== undefined
              ? ` · ${table.rows}×${table.cols}`
              : ""}
          </p>
          {table.html ? (
            <div
              className="max-h-48 overflow-auto overscroll-contain rounded-sm border border-border bg-background p-2 text-xs [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-1 [&_td]:py-0.5 [&_th]:border [&_th]:border-border [&_th]:px-1 [&_th]:py-0.5"
              dangerouslySetInnerHTML={{ __html: table.html }}
            />
          ) : table.cells?.length ? (
            <div className="max-h-40 overflow-auto overscroll-contain space-y-0.5">
              {table.cells.map((cell, ci) => (
                <div
                  key={ci}
                  className="rounded-sm bg-secondary/40 px-2 py-1 font-mono text-[10px]"
                >
                  r{cell.row ?? "?"} c{cell.col ?? "?"}: {cell.text ?? "—"}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
