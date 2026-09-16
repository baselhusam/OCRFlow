const PROJECTS_VIEW_MODE_KEY = "ocrflow-projects-view-mode";
const PROJECTS_VIEW_MODE_EVENT = "ocrflow-projects-view-mode-change";

export type ProjectsViewMode = "cards" | "table";

const DEFAULT_PROJECTS_VIEW_MODE: ProjectsViewMode = "cards";

export function readProjectsViewMode(): ProjectsViewMode {
  if (typeof window === "undefined") return DEFAULT_PROJECTS_VIEW_MODE;
  try {
    const raw = window.localStorage.getItem(PROJECTS_VIEW_MODE_KEY);
    return raw === "table" ? "table" : DEFAULT_PROJECTS_VIEW_MODE;
  } catch {
    return DEFAULT_PROJECTS_VIEW_MODE;
  }
}

export function writeProjectsViewMode(mode: ProjectsViewMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECTS_VIEW_MODE_KEY, mode);
  } catch {
    // Storage may be unavailable (private mode, blocked); listeners still get the event.
  }
  window.dispatchEvent(new Event(PROJECTS_VIEW_MODE_EVENT));
}

export function subscribeProjectsViewMode(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROJECTS_VIEW_MODE_KEY) onChange();
  };

  window.addEventListener(PROJECTS_VIEW_MODE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PROJECTS_VIEW_MODE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getProjectsViewModeServerSnapshot(): ProjectsViewMode {
  return DEFAULT_PROJECTS_VIEW_MODE;
}
