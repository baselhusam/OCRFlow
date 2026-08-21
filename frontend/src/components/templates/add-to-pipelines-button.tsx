"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppToast } from "@/components/app-toast";
import {
  UnauthenticatedTemplateError,
  addTemplateToAccount,
  templateAddLoginPath,
} from "@/lib/templates/add";
import { cn } from "@/lib/utils";

type AddToPipelinesButtonProps = {
  slug: string;
  autoAdd?: boolean;
  className?: string;
  size?: "hero" | "card";
};

function autoAddLockKey(slug: string) {
  return `ocrflow-template-autoadd:${slug}`;
}

export function AddToPipelinesButton({
  slug,
  autoAdd = false,
  className,
  size = "hero",
}: AddToPipelinesButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(autoAdd);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  async function addTemplate(fromAutoAdd = false) {
    if (fromAutoAdd) {
      const key = autoAddLockKey(slug);
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
    if (lockRef.current) return;
    lockRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const pipeline = await addTemplateToAccount(slug);
      router.push(
        `/app/pipelines?added=${encodeURIComponent(pipeline.name)}`,
      );
      router.refresh();
    } catch (submitError) {
      lockRef.current = false;
      if (fromAutoAdd) {
        sessionStorage.removeItem(autoAddLockKey(slug));
      }
      if (submitError instanceof UnauthenticatedTemplateError) {
        router.push(templateAddLoginPath(slug));
        return;
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add this template",
      );
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!autoAdd) return;

    if (sessionStorage.getItem(autoAddLockKey(slug))) {
      setIsSubmitting(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has("add")) {
      params.delete("add");
      const nextSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
      );
    }

    void addTemplate(true);
    // Auto-add once after returning from login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdd, slug]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void addTemplate(false);
        }}
        disabled={isSubmitting}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground no-underline shadow-[0_8px_24px_-10px_var(--accent)] transition-opacity hover:opacity-90 disabled:opacity-70",
          size === "hero"
            ? "px-6 py-[13px] text-[15px]"
            : "px-4 py-2.5 text-[13px]",
          className,
        )}
      >
        {isSubmitting ? "Adding…" : "Add to my pipelines"}
      </button>
      {error ? (
        <AppToast
          variant="error"
          title="Could not add template"
          message={error}
          toastKey={error}
          onDismiss={() => setError(null)}
        />
      ) : null}
    </>
  );
}
