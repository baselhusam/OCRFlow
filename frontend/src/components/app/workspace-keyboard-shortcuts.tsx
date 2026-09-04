"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isEditableKeyboardTarget } from "@/lib/keyboard-shortcuts";

const workspaceDestinations = [
  "/app",
  "/app/projects",
  "/app/pipelines",
  "/app/jobs",
  "/app/analytics",
];

export function WorkspaceKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isEditableKeyboardTarget(event.target)
      ) {
        const destination = workspaceDestinations[Number(event.key) - 1];
        if (destination) {
          event.preventDefault();
          router.push(destination);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
