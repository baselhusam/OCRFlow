"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { AppToast } from "@/components/app-toast";
import { TemplateGlyph } from "@/components/templates/template-glyph";
import {
  PIPELINE_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  type PipelineTemplate,
} from "@/lib/templates/catalog";
import {
  UnauthenticatedTemplateError,
  addTemplateToAccount,
  templateAddLoginPath,
} from "@/lib/templates/add";
import { cn } from "@/lib/utils";

/** Featured first, then catalogue order. */
function pickTemplates(limit: number): PipelineTemplate[] {
  const featured = PIPELINE_TEMPLATES.filter((template) => template.featured);
  const rest = PIPELINE_TEMPLATES.filter((template) => !template.featured);
  return [...featured, ...rest].slice(0, limit);
}

type TemplateQuickStartProps = {
  limit?: number;
  /** When false, cards link to the template detail page instead of cloning. */
  canWrite?: boolean;
  className?: string;
};

/**
 * One-click template row: clones the template into the account as a pipeline
 * and opens its canvas straight away.
 */
export function TemplateQuickStart({
  limit = 4,
  canWrite = true,
  className,
}: TemplateQuickStartProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const templates = pickTemplates(limit);

  async function applyTemplate(slug: string) {
    if (pending) return;
    setPending(slug);
    setError(null);
    try {
      const pipeline = await addTemplateToAccount(slug);
      router.push(`/app/pipelines/${pipeline.id}/canvas`);
    } catch (submitError) {
      setPending(null);
      if (submitError instanceof UnauthenticatedTemplateError) {
        router.push(templateAddLoginPath(slug));
        return;
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add this template",
      );
    }
  }

  return (
    <>
      <ul
        className={cn(
          // Phones: a swipeable row; wider screens: a grid.
          "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4",
          className,
        )}
      >
        {templates.map((template) => {
          const isPending = pending === template.slug;
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
                  <TemplateGlyph template={template} className="size-[18px]" />
                </span>
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  {TEMPLATE_CATEGORY_LABELS[template.category]}
                </span>
              </div>
              <p className="mt-3.5 text-[15px] font-bold tracking-[-0.01em] text-foreground">
                {template.name}
              </p>
              <p className="mt-1 line-clamp-2 min-h-[40px] text-[13px] leading-snug text-muted-foreground">
                {template.summary}
              </p>
              <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[var(--landing-hairline)] pt-3">
                <span className="flex items-center gap-1" aria-hidden>
                  {template.graph.nodes.map((node, index) => (
                    <span key={node.id} className="flex items-center gap-1">
                      {index > 0 ? (
                        <span className="h-px w-2 bg-primary/35" />
                      ) : null}
                      <span className="size-2 rounded-[3px] bg-primary/70" />
                    </span>
                  ))}
                  <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                    {template.graph.nodes.length} stages
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                  {isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Opening…
                    </>
                  ) : (
                    <>
                      {canWrite ? "Use" : "View"}
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover/template:translate-x-0.5"
                        aria-hidden
                      />
                    </>
                  )}
                </span>
              </div>
            </>
          );

          const cardClass =
            "group/template project-card flex h-full w-full flex-col p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait";

          return (
            <li
              key={template.slug}
              className="w-[80%] shrink-0 snap-start sm:w-auto"
            >
              {canWrite ? (
                <button
                  type="button"
                  className={cardClass}
                  disabled={Boolean(pending)}
                  onClick={() => void applyTemplate(template.slug)}
                  aria-label={`Use the ${template.name} template`}
                >
                  {body}
                </button>
              ) : (
                <Link href={`/templates/${template.slug}`} className={cardClass}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <AppToast
          variant="error"
          title="Could not use template"
          message={error}
          toastKey={error}
          onDismiss={() => setError(null)}
        />
      ) : null}
    </>
  );
}
