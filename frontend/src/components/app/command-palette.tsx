"use client";

import {
  ArrowRight,
  BookOpen,
  Command,
  FolderKanban,
  GitBranch,
  Keyboard,
  LayoutDashboard,
  ListTree,
  Play,
  Save,
  Search,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listPipelines } from "@/lib/api/pipelines";
import { listProjects } from "@/lib/api/projects";
import { docsHref, flattenDocsNav } from "@/lib/docs/nav";
import {
  CANVAS_COMMAND_EVENT,
  OPEN_SHORTCUTS_EVENT,
  type CanvasCommand,
  isEditableKeyboardTarget,
  shortcutLabel,
} from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

type PaletteItem = {
  id: string;
  title: string;
  subtitle: string;
  group: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  command?: CanvasCommand;
  keywords?: string;
  shortcut?: string;
};

const navigationItems: PaletteItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "Workspace overview",
    group: "Navigate",
    icon: LayoutDashboard,
    href: "/app",
    shortcut: "Alt 1",
  },
  {
    id: "projects",
    title: "Projects",
    subtitle: "Browse document workspaces",
    group: "Navigate",
    icon: FolderKanban,
    href: "/app/projects",
    shortcut: "Alt 2",
  },
  {
    id: "pipelines",
    title: "Pipelines",
    subtitle: "Manage reusable flows",
    group: "Navigate",
    icon: GitBranch,
    href: "/app/pipelines",
    shortcut: "Alt 3",
  },
  {
    id: "jobs",
    title: "Jobs & uploaded documents",
    subtitle: "Run pipelines across uploaded files",
    group: "Navigate",
    icon: Workflow,
    href: "/app/jobs",
    shortcut: "Alt 4",
    keywords: "documents uploads batch runs",
  },
  {
    id: "analytics",
    title: "Analytics",
    subtitle: "Explore activity and usage",
    group: "Navigate",
    icon: Sparkles,
    href: "/app/analytics",
    shortcut: "Alt 5",
  },
  {
    id: "configuration",
    title: "Configuration",
    subtitle: "Connect models and runtime services",
    group: "Navigate",
    icon: Settings2,
    href: "/app/configuration",
    keywords: "models connections http providers engines",
  },
  {
    id: "nodes-models",
    title: "Models & nodes",
    subtitle: "Configure available OCR models and providers",
    group: "Navigate",
    icon: ListTree,
    href: "/app/configuration",
    keywords: "node model library palette connection",
  },
  {
    id: "connections",
    title: "Connections & typed wires",
    subtitle: "Learn how nodes connect on the canvas",
    group: "Navigate",
    icon: Workflow,
    href: "/documentation/connecting-nodes",
    keywords: "nodes wire connection output input",
  },
  {
    id: "http-api",
    title: "HTTP API reference",
    subtitle: "Use OCRFlow pipelines through HTTP",
    group: "Navigate",
    icon: BookOpen,
    href: "/documentation/api",
    keywords: "http api integration endpoint",
  },
  {
    id: "documentation",
    title: "Documentation",
    subtitle: "Guides, API, and platform reference",
    group: "Navigate",
    icon: BookOpen,
    href: "/documentation",
    keywords: "docs help api http",
  },
];

const canvasItems: PaletteItem[] = [
  {
    id: "run-canvas",
    title: "Run all nodes",
    subtitle: "Run the current canvas in dependency order",
    group: "Canvas",
    icon: Play,
    command: "run",
    shortcut: "Mod Enter",
    keywords: "pipeline run execute",
  },
  {
    id: "save-canvas",
    title: "Save canvas",
    subtitle: "Save your current graph changes",
    group: "Canvas",
    icon: Save,
    command: "save",
    shortcut: "Mod S",
  },
  {
    id: "layout-canvas",
    title: "Auto-arrange nodes",
    subtitle: "Lay out the current graph left to right",
    group: "Canvas",
    icon: Workflow,
    command: "auto-layout",
  },
  {
    id: "library-canvas",
    title: "Toggle model library",
    subtitle: "Open or close the nodes and models panel",
    group: "Canvas",
    icon: ListTree,
    command: "toggle-library",
    shortcut: "Mod Shift P",
    keywords: "palette nodes connections models",
  },
];

const shortcutGroups = [
  {
    title: "Global",
    rows: [
      ["Open command palette", "Mod K"],
      ["Show keyboard shortcuts", "?"],
      ["Close a dialog or clear selection", "Esc"],
    ],
  },
  {
    title: "Workspace",
    rows: [
      ["Toggle the workspace sidebar", "Mod B"],
      ["Dashboard / Projects / Pipelines", "Alt 1 / 2 / 3"],
      ["Jobs / Analytics", "Alt 4 / 5"],
    ],
  },
  {
    title: "Canvas",
    rows: [
      ["Run all nodes", "Mod Enter"],
      ["Save graph", "Mod S"],
      ["Toggle model library", "Mod Shift P"],
      ["Select tool / Pan tool", "V / H"],
      ["Copy / cut / paste / duplicate", "Mod C / X / V / D"],
      ["Undo node deletion", "Mod Z"],
    ],
  },
];

function matchesQuery(item: PaletteItem, query: string) {
  const haystack = [item.title, item.subtitle, item.group, item.keywords]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
      {shortcutLabel(children)}
    </kbd>
  );
}

function shortcutSearchTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replaceAll("⌘", "mod")
    .replaceAll("command", "mod")
    .replaceAll("cmd", "mod")
    .replaceAll("control", "mod")
    .replaceAll("ctrl", "mod")
    .split(/[\s+/,]+/)
    .filter(Boolean);
}

function matchesShortcutSearch(label: string, keys: string, query: string) {
  const queryTokens = shortcutSearchTokens(query);
  if (queryTokens.length === 0) return true;
  const searchable = new Set(
    shortcutSearchTokens(`${label} ${keys} ${shortcutLabel(keys)}`),
  );
  return queryTokens.every((token) => searchable.has(token));
}

type CommandPaletteProps = {
  compact?: boolean;
  responsive?: boolean;
  className?: string;
};

export function CommandPalette({
  compact = false,
  responsive = false,
  className,
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcutsInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [shortcutsQuery, setShortcutsQuery] = useState("");
  const [projects, setProjects] = useState<PaletteItem[]>([]);
  const [pipelines, setPipelines] = useState<PaletteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const onCanvas = pathname.includes("/canvas");

  const loadWorkspaceItems = useCallback(async () => {
    try {
      const [projectData, pipelineData] = await Promise.all([
        listProjects(),
        listPipelines(),
      ]);
      setProjects(
        projectData.map((project) => ({
          id: `project-${project.id}`,
          title: project.name,
          subtitle: project.description || "Open project canvas",
          group: "Projects",
          icon: FolderKanban,
          href: `/app/projects/${project.id}/canvas`,
          keywords: "project canvas nodes documents",
        })),
      );
      setPipelines(
        pipelineData.map((pipeline) => ({
          id: `pipeline-${pipeline.id}`,
          title: pipeline.name,
          subtitle: pipeline.description || "Open pipeline canvas",
          group: "Pipelines",
          icon: GitBranch,
          href: `/app/pipelines/${pipeline.id}/canvas`,
          keywords: "pipeline canvas models nodes connections",
        })),
      );
    } catch {
      // Navigation remains available when the recent-item request is unavailable.
    }
  }, []);

  const openPalette = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setOpen(true);
    void loadWorkspaceItems();
  }, [loadWorkspaceItems]);

  const openShortcuts = useCallback(() => {
    setShortcutsQuery("");
    setShortcutsOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!shortcutsOpen) return;
    const frame = window.requestAnimationFrame(() =>
      shortcutsInputRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [shortcutsOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          openPalette();
        }
        return;
      }
      if (
        onCanvas &&
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "p" &&
        !isEditableKeyboardTarget(event.target)
      ) {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent<CanvasCommand>(CANVAS_COMMAND_EVENT, {
            detail: "toggle-library",
          }),
        );
        return;
      }
      if (
        event.key === "?" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableKeyboardTarget(event.target)
      ) {
        event.preventDefault();
        openShortcuts();
      }
    };
    const onOpenShortcuts = () => openShortcuts();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onOpenShortcuts);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onOpenShortcuts);
    };
  }, [onCanvas, open, openPalette, openShortcuts]);

  const items = useMemo(() => {
    const docsItems: PaletteItem[] = flattenDocsNav().map((item) => ({
      id: `doc-${item.slug || "home"}`,
      title: item.title,
      subtitle: item.description,
      group: "Documentation",
      icon: BookOpen,
      href: docsHref(item.slug),
      keywords: `${item.section} docs guide`,
    }));
    return [
      ...(onCanvas ? canvasItems : []),
      ...navigationItems,
      ...projects,
      ...pipelines,
      ...docsItems,
    ].filter((item) => matchesQuery(item, query));
  }, [onCanvas, pipelines, projects, query]);

  const safeSelectedIndex = Math.min(
    selectedIndex,
    Math.max(0, items.length - 1),
  );

  const execute = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      if (item.command) {
        window.dispatchEvent(
          new CustomEvent<CanvasCommand>(CANVAS_COMMAND_EVENT, {
            detail: item.command,
          }),
        );
        return;
      }
      if (item.href) router.push(item.href);
    },
    [router],
  );

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = items[safeSelectedIndex];
      if (selected) execute(selected);
    }
  };

  const groupedItems = items.reduce<Record<string, PaletteItem[]>>(
    (groups, item) => {
      (groups[item.group] ??= []).push(item);
      return groups;
    },
    {},
  );
  let itemIndex = -1;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon-sm" : "sm"}
        onClick={openPalette}
        aria-label="Open command palette"
        className={cn(
          compact
            ? "size-9 rounded-lg text-muted-foreground"
            : responsive
              ? "size-9 min-w-0 justify-center rounded-lg border-border bg-muted/35 px-0 text-muted-foreground hover:bg-muted/65 md:w-[15rem] md:justify-between md:px-3"
              : "h-9 min-w-[12rem] justify-between rounded-lg border-border bg-muted/35 px-3 text-muted-foreground hover:bg-muted/65 sm:min-w-[15rem]",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" aria-hidden />
          {!compact ? (
            <span className={cn("text-[13px]", responsive && "hidden md:inline")}>
              Search or jump to…
            </span>
          ) : null}
        </span>
        {!compact ? (
          <span className={responsive ? "hidden md:inline" : undefined}>
            <Keycap>Mod K</Keycap>
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(42rem,calc(100%-1.5rem))] max-w-none gap-0 overflow-hidden p-0 shadow-2xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Command className="size-5 text-primary" aria-hidden />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleListKeyDown}
              placeholder="Search pages, projects, pipelines, models…"
              aria-label="Search commands"
              className="h-8 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
            />
            <Keycap>Esc</Keycap>
          </div>
          <div className="max-h-[min(30rem,calc(100vh-10rem))] overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                No pages, projects, pipelines, or commands match “{query}”.
              </p>
            ) : (
              Object.entries(groupedItems).map(([group, groupItems]) => (
                <section key={group} className="py-1.5">
                  <h3 className="px-2 py-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {group}
                  </h3>
                  {groupItems.map((item) => {
                    itemIndex += 1;
                    const currentIndex = itemIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseMove={() => setSelectedIndex(currentIndex)}
                        onClick={() => execute(item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                          safeSelectedIndex === currentIndex
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground hover:bg-muted/70",
                        )}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </span>
                        {item.shortcut ? <Keycap>{item.shortcut}</Keycap> : null}
                        <ArrowRight className="size-3.5 text-muted-foreground/60" aria-hidden />
                      </button>
                    );
                  })}
                </section>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
            <span>↑↓ to move · ↵ to select</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-foreground"
              onClick={() => {
                setOpen(false);
                openShortcuts();
              }}
            >
              <Keyboard className="size-3" aria-hidden />
              View shortcuts
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="w-[min(38rem,calc(100%-1.5rem))] max-w-none p-0" showCloseButton>
          <DialogHeader className="border-b border-border px-5 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Keyboard className="size-4 text-primary" aria-hidden />
              Keyboard shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(32rem,calc(100vh-10rem))] overflow-y-auto p-5">
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              Search by action or keys — for example “run”, “sidebar”, “⌘ K”, or “Alt 4”.
            </p>
            <div className="relative mb-5">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={shortcutsInputRef}
                value={shortcutsQuery}
                onChange={(event) => setShortcutsQuery(event.target.value)}
                placeholder="Search keyboard shortcuts…"
                aria-label="Search keyboard shortcuts"
                className="h-10 rounded-lg bg-muted/40 pl-9"
              />
            </div>
            <div className="space-y-5">
              {shortcutGroups.map((group) => {
                const rows = group.rows.filter(([label, keys]) =>
                  matchesShortcutSearch(label, keys, shortcutsQuery),
                );
                if (rows.length === 0) return null;
                return (
                  <section key={group.title}>
                    <h3 className="mb-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                      {group.title}
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-border">
                    {rows.map(([label, keys], index) => (
                      <div
                        key={label}
                        className={cn(
                          "flex items-center justify-between gap-4 px-3 py-2.5 text-sm",
                          index > 0 && "border-t border-border",
                        )}
                      >
                        <span>{label}</span>
                        <span className="text-right font-mono text-[11px] text-muted-foreground">
                          {shortcutLabel(keys)}
                        </span>
                      </div>
                    ))}
                    </div>
                  </section>
                );
              })}
            </div>
            {!shortcutGroups.some((group) =>
              group.rows.some(([label, keys]) =>
                matchesShortcutSearch(label, keys, shortcutsQuery),
              ),
            ) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No keyboard shortcuts match “{shortcutsQuery}”.
              </p>
            ) : null}
            <p className="mt-5 text-xs text-muted-foreground">
              The command palette also searches projects, pipelines, documentation, and contextual canvas actions.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
