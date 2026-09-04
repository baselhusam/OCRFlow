export type CanvasCommand =
  | "run"
  | "save"
  | "auto-layout"
  | "toggle-library";

export const CANVAS_COMMAND_EVENT = "ocrflow:canvas-command";
export const OPEN_SHORTCUTS_EVENT = "ocrflow:open-shortcuts";

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  return Boolean(
    (target as HTMLElement | null)?.closest(
      "input, textarea, select, [contenteditable=true]",
    ),
  );
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function shortcutLabel(shortcut: string): string {
  const modifier = isApplePlatform() ? "⌘" : "Ctrl";
  return shortcut.replace("Mod", modifier);
}
