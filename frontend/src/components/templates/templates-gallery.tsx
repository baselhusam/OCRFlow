"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { AddToPipelinesButton } from "@/components/templates/add-to-pipelines-button";
import { TemplateFlowPreview } from "@/components/templates/template-flow-preview";
import { TemplateGlyph } from "@/components/templates/template-glyph";
import type {
  PipelineTemplate,
  TemplateCategory,
} from "@/lib/templates/catalog";
import {
  TEMPLATE_CATEGORY_LABELS,
  listTemplateCategories,
} from "@/lib/templates/catalog";
import { cn } from "@/lib/utils";

type TemplatesGalleryProps = {
  templates: PipelineTemplate[];
};

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function FieldChips({
  fields,
  limit,
}: {
  fields: PipelineTemplate["fields"];
  limit?: number;
}) {
  const shown = limit ? fields.slice(0, limit) : fields;
  const rest = limit ? Math.max(0, fields.length - limit) : 0;

  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((field) => (
        <li
          key={field.key}
          className="rounded-md border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] px-2.5 py-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
        >
          {field.label}
        </li>
      ))}
      {rest > 0 ? (
        <li className="px-1 py-1 font-mono text-[11px] text-muted-foreground">
          +{rest}
        </li>
      ) : null}
    </ul>
  );
}

export function TemplatesGallery({ templates }: TemplatesGalleryProps) {
  const categories = useMemo(() => listTemplateCategories(), []);
  const [active, setActive] = useState<"all" | TemplateCategory>("all");

  const featured = templates.find((template) => template.featured);
  const rest = templates.filter((template) => {
    if (template.featured) return false;
    if (active === "all") return true;
    return template.category === active;
  });
  const showFeatured = featured && (active === "all" || featured.category === active);

  return (
    <div className="mx-auto w-full max-w-6xl px-8 pb-24 pt-6">
      <p className="font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
        Templates
      </p>
      <h1 className="mt-3.5 max-w-2xl text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground md:text-[48px]">
        Start from a proven OCR pipeline
      </h1>
      <p className="mt-4 max-w-[560px] text-base leading-relaxed text-[var(--subtle-foreground)]">
        Curated graphs for invoices, receipts, IDs, contracts, and more. Add
        one to your account, then apply it to a document batch from Jobs.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <FilterChip
          label="All"
          active={active === "all"}
          onClick={() => setActive("all")}
        />
        {categories.map((category) => (
          <FilterChip
            key={category}
            label={TEMPLATE_CATEGORY_LABELS[category]}
            active={active === category}
            onClick={() => setActive(category)}
          />
        ))}
      </div>

      {showFeatured && featured ? (
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)]"
        >
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex size-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <TemplateGlyph template={featured} />
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Featured
                </span>
                <span className="rounded-[5px] border border-[var(--landing-hairline)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground uppercase">
                  {TEMPLATE_CATEGORY_LABELS[featured.category]}
                </span>
              </div>
              <h2 className="mt-4 text-[28px] font-bold tracking-[-0.03em] text-foreground">
                {featured.name}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {featured.description}
              </p>
              <p className="mt-5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                Extracts
              </p>
              <div className="mt-3">
                <FieldChips fields={featured.fields} />
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <AddToPipelinesButton slug={featured.slug} />
                <Link
                  href={`/templates/${featured.slug}`}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-[13px] text-[15px] font-semibold text-[var(--subtle-foreground)] no-underline transition-colors hover:text-foreground"
                >
                  View pipeline
                  <ArrowIcon />
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center border-t border-[var(--landing-node-border)] p-6 md:p-8 lg:border-t-0 lg:border-l">
              <TemplateFlowPreview template={featured} />
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                {featured.inputHint} · {featured.bestFor}
              </p>
            </div>
          </div>
        </motion.article>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {rest.map((template, index) => (
          <motion.article
            key={template.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: 0.04 * index,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] p-6 transition-colors hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <TemplateGlyph template={template} />
              </span>
              <span className="rounded-[5px] border border-[var(--landing-hairline)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground uppercase">
                {TEMPLATE_CATEGORY_LABELS[template.category]}
              </span>
            </div>
            <h2 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-foreground">
              <Link
                href={`/templates/${template.slug}`}
                className="text-inherit no-underline hover:text-primary"
              >
                {template.name}
              </Link>
            </h2>
            <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-muted-foreground">
              {template.summary}
            </p>
            <div className="mt-4">
              <FieldChips fields={template.fields} limit={4} />
            </div>
            <div className="mt-5">
              <TemplateFlowPreview template={template} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <AddToPipelinesButton slug={template.slug} size="card" />
              <Link
                href={`/templates/${template.slug}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--subtle-foreground)] no-underline transition-colors hover:text-foreground"
              >
                Details
                <ArrowIcon />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3.5 py-1.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-[var(--landing-ghost-border)] bg-[var(--landing-ghost-bg)] text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
