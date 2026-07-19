import {
  Cpu,
  FileSearch,
  FileStack,
  FileText,
  FolderKanban,
  GitBranch,
  IdCard,
  Layers,
  Receipt,
  Scan,
  type LucideIcon,
} from "lucide-react";

export const PROJECT_COLORS = [
  "#5B2EEF",
  "#2F6BFF",
  "#12A65B",
  "#FF5A2C",
  "#E0245E",
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_COLOR_TINTS: Record<ProjectColor, string> = {
  "#5B2EEF": "#EDE9FE",
  "#2F6BFF": "#E2ECFF",
  "#12A65B": "#DCF3E7",
  "#FF5A2C": "#FFE6DC",
  "#E0245E": "#FBDCE6",
};

export const DEFAULT_PROJECT_COLOR: ProjectColor = "#5B2EEF";
export const DEFAULT_PROJECT_ICON = "file-text";

export const PROJECT_ICON_OPTIONS = [
  { key: "file-text", label: "Document", icon: FileText },
  { key: "folder-kanban", label: "Kanban", icon: FolderKanban },
  { key: "scan", label: "Scan", icon: Scan },
  { key: "receipt", label: "Receipt", icon: Receipt },
  { key: "passport", label: "Identity", icon: IdCard },
  { key: "file-search", label: "Search", icon: FileSearch },
  { key: "git-branch", label: "Pipeline", icon: GitBranch },
  { key: "layers", label: "Layers", icon: Layers },
  { key: "cpu", label: "Models", icon: Cpu },
  { key: "file-stack", label: "Files", icon: FileStack },
] as const;

export type ProjectIconKey = (typeof PROJECT_ICON_OPTIONS)[number]["key"];

const ICON_MAP = Object.fromEntries(
  PROJECT_ICON_OPTIONS.map((option) => [option.key, option.icon]),
) as Record<ProjectIconKey, LucideIcon>;

export function getProjectIconComponent(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey as ProjectIconKey] ?? FileText;
}

export function getProjectColorTint(color: string): string {
  return (
    PROJECT_COLOR_TINTS[color as ProjectColor] ??
    PROJECT_COLOR_TINTS[DEFAULT_PROJECT_COLOR]
  );
}

export function isProjectColor(value: string): value is ProjectColor {
  return PROJECT_COLORS.includes(value as ProjectColor);
}

export function isProjectIconKey(value: string): value is ProjectIconKey {
  return PROJECT_ICON_OPTIONS.some((option) => option.key === value);
}
