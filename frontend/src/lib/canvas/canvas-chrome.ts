export const CANVAS_TOP_BAR_HEIGHT = 60;
export const CANVAS_PALETTE_WIDTH = 288;
export const CANVAS_PALETTE_COLLAPSED_WIDTH = 48;
export const CANVAS_INSPECTOR_WIDTH = 372;

export const canvasTopBarClassName =
  "box-border flex h-[60px] shrink-0 items-center border-b border-border bg-card";

export const canvasPaletteSectionLabelClassName =
  "font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase";

export const canvasInspectorSectionLabelClassName =
  "font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase";

export const canvasInspectorTabsShellClassName =
  "shrink-0 border-b border-border/60 px-[18px] py-3";

export const canvasInspectorTabsListClassName =
  "h-auto w-full gap-1 rounded-[10px] bg-muted/50 p-1 text-muted-foreground shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]";

export const canvasInspectorTabTriggerClassName =
  "h-8 min-w-0 flex-1 gap-1.5 rounded-[8px] border border-transparent px-2.5 text-[12px] font-medium leading-none text-muted-foreground transition-[color,background-color,box-shadow,border-color] hover:text-foreground data-active:border-border/55 data-active:bg-card data-active:text-foreground data-active:shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_10%,transparent),0_0_0_1px_color-mix(in_srgb,var(--foreground)_4%,transparent)]";

export const canvasInspectorSubTabsShellClassName =
  "shrink-0 border-b border-border/60 px-[18px] py-2.5";

export const canvasInspectorSubTabsListClassName =
  "h-auto w-full gap-1 rounded-lg bg-muted/40 p-0.5 text-muted-foreground";

export const canvasInspectorSubTabTriggerClassName =
  "h-7 min-w-0 flex-1 gap-1 rounded-[7px] border border-transparent px-2 text-[11px] font-medium leading-none text-muted-foreground transition-[color,background-color,box-shadow,border-color] hover:text-foreground data-active:border-border/45 data-active:bg-card/95 data-active:text-foreground data-active:shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_8%,transparent)]";

export const canvasStatusDotClassName = "size-1.5 shrink-0 rounded-full";

export const canvasBreadcrumbChipClassName =
  "inline-flex items-center gap-2 rounded-[7px] border px-2.5 py-1 text-sm font-bold tracking-tight";
