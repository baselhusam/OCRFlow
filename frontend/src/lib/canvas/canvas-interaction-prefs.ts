const CANVAS_INTERACTION_MODE_KEY = "ocrflow-canvas-interaction-mode";
const CANVAS_INTERACTION_MODE_EVENT = "ocrflow-canvas-interaction-mode-change";

export type CanvasInteractionMode = "select" | "pan";

export function readCanvasInteractionMode(): CanvasInteractionMode {
  if (typeof window === "undefined") return "select";
  try {
    const raw = window.localStorage.getItem(CANVAS_INTERACTION_MODE_KEY);
    return raw === "pan" ? "pan" : "select";
  } catch {
    return "select";
  }
}

export function writeCanvasInteractionMode(mode: CanvasInteractionMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CANVAS_INTERACTION_MODE_KEY, mode);
  window.dispatchEvent(new Event(CANVAS_INTERACTION_MODE_EVENT));
}

export function subscribeCanvasInteractionMode(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CANVAS_INTERACTION_MODE_KEY) onChange();
  };

  window.addEventListener(CANVAS_INTERACTION_MODE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CANVAS_INTERACTION_MODE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getCanvasInteractionModeServerSnapshot(): CanvasInteractionMode {
  return "select";
}
