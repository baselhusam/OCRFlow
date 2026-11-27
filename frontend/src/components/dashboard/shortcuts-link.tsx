"use client";

import type { ReactNode } from "react";

import { OPEN_SHORTCUTS_EVENT } from "@/lib/keyboard-shortcuts";

/** Opens the global keyboard-shortcuts dialog (owned by the command palette). */
export function ShortcutsLink({ icon }: { icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
    >
      {icon}
      Keyboard shortcuts
      <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">?</kbd>
    </button>
  );
}
