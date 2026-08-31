"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpenText,
  FileStack,
  Landmark,
  LayoutGrid,
  Microscope,
  ScanFace,
  type LucideIcon,
} from "lucide-react";

import { AddToPipelinesButton } from "@/components/templates/add-to-pipelines-button";
import { TemplateFlowPreview } from "@/components/templates/template-flow-preview";
import { TemplateGlyph } from "@/components/templates/template-glyph";
import type { PipelineTemplate, TemplateCategory } from "@/lib/templates/catalog";
import { TEMPLATE_CATEGORY_LABELS, listTemplateCategories } from "@/lib/templates/catalog";
import { cn } from "@/lib/utils";

type TemplatesGalleryProps = { templates: PipelineTemplate[] };

const CATEGORY_ICONS: Record<TemplateCategory, LucideIcon> = {
  finance: Landmark,
  identity: ScanFace,
  documents: FileStack,
  research: Microscope,
  visual: BookOpenText,
};

function ArrowIcon() {
  return <ArrowRight className="size-3.5" aria-hidden />;
}

function FieldChips({ fields, limit }: { fields: PipelineTemplate["fields"]; limit?: number }) {
  const shown = limit ? fields.slice(0, limit) : fields;
  const rest = limit ? Math.max(0, fields.length - limit) : 0;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((field) => (
        <li key={field.key} className="rounded-md border border-[var(--landing-node-border)] bg-background px-2 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          {field.label}
        </li>
      ))}
      {rest > 0 ? <li className="px-1 py-1 font-mono text-[10px] text-muted-foreground">+{rest}</li> : null}
    </ul>
  );
}

export function TemplatesGallery({ templates }: TemplatesGalleryProps) {
  const categories = useMemo(() => listTemplateCategories(), []);
  const [active, setActive] = useState<"all" | TemplateCategory>("all");
  const featured = templates.find((template) => template.featured);
  const rest = templates.filter((template) => !template.featured && (active === "all" || template.category === active));
  const showFeatured = featured && (active === "all" || featured.category === active);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 sm:px-8 md:pt-14">
      <header className="max-w-3xl border-b border-[var(--landing-node-border)] pb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            01 — Templates
          </p>
          <p className="hidden font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase sm:block">
            Curated pipeline library
          </p>
        </div>
        <h1 className="mt-4 text-[38px] font-extrabold leading-[1.04] tracking-[-0.04em] text-foreground sm:text-[48px]">
          Start from a proven OCR pipeline
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--subtle-foreground)] sm:text-base">
          Curated graphs for invoices, receipts, IDs, contracts, and more. Add one to your account, then apply it to a document batch from Jobs.
        </p>
      </header>

      <nav aria-label="Template categories" className="mt-6 flex flex-wrap gap-2">
        <FilterChip icon={LayoutGrid} label="All" active={active === "all"} onClick={() => setActive("all")} />
        {categories.map((category) => (
          <FilterChip
            key={category}
            icon={CATEGORY_ICONS[category]}
            label={TEMPLATE_CATEGORY_LABELS[category]}
            active={active === category}
            onClick={() => setActive(category)}
          />
        ))}
      </nav>

      {showFeatured && featured ? (
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9 overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] shadow-[0_18px_40px_-38px_rgba(20,18,37,0.65)]"
        >
          <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
            <div className="p-7 sm:p-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex size-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <TemplateGlyph template={featured} />
                </span>
                <span className="rounded-[5px] border border-[var(--landing-hairline)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {TEMPLATE_CATEGORY_LABELS[featured.category]}
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
                  Featured template
                </span>
              </div>
              <h2 className="mt-6 text-[30px] font-bold tracking-[-0.04em] text-foreground">{featured.name}</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{featured.description}</p>
              <p className="mt-6 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Extracts</p>
              <div className="mt-3"><FieldChips fields={featured.fields} /></div>
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <AddToPipelinesButton slug={featured.slug} />
                <Link href={`/templates/${featured.slug}`} className="inline-flex items-center gap-2 rounded-lg px-4 py-[13px] text-[14px] font-semibold text-[var(--subtle-foreground)] no-underline transition-colors hover:text-foreground">
                  View pipeline
                  <ArrowIcon />
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center border-t border-[var(--landing-node-border)] bg-muted/30 p-6 sm:p-8 lg:border-t-0 lg:border-l">
              <TemplateFlowPreview template={featured} variant="hero" />
              <dl className="mt-5 grid gap-3 border-t border-[var(--landing-node-border)] pt-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.13em] text-muted-foreground uppercase">Input</dt>
                  <dd className="mt-1 text-[12px] leading-relaxed text-[var(--subtle-foreground)]">{featured.inputHint}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.13em] text-muted-foreground uppercase">Best for</dt>
                  <dd className="mt-1 text-[12px] leading-relaxed text-[var(--subtle-foreground)]">{featured.bestFor}</dd>
                </div>
              </dl>
            </div>
          </div>
        </motion.article>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {rest.map((template, index) => (
          <motion.article
            key={template.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
            style={{ "--template-accent": template.accentColor } as CSSProperties}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] p-5 shadow-[0_10px_26px_-24px_rgba(20,18,37,0.7)] transition-[border-color,box-shadow,transform] duration-300 sm:p-6 hover:-translate-y-0.5 hover:border-[var(--template-accent)] hover:shadow-[0_18px_34px_-28px_rgba(20,18,37,0.7)]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-9 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--template-accent)_10%,transparent)] text-[var(--template-accent)]">
                <TemplateGlyph template={template} className="size-5" />
              </span>
              <span className="rounded-[5px] border border-[var(--landing-hairline)] px-2 py-0.5 font-mono text-[9px] text-muted-foreground uppercase">
                {TEMPLATE_CATEGORY_LABELS[template.category]}
              </span>
            </div>
            <h2 className="mt-5 text-[21px] font-bold tracking-[-0.025em] text-foreground">
              <Link href={`/templates/${template.slug}`} className="text-inherit no-underline transition-colors group-hover:text-[var(--template-accent)]">
                {template.name}
              </Link>
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{template.summary}</p>
            <div className="mt-5"><TemplateFlowPreview template={template} /></div>
            <div className="mt-5"><FieldChips fields={template.fields} limit={4} /></div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <AddToPipelinesButton slug={template.slug} size="card" />
              <Link href={`/templates/${template.slug}`} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--subtle-foreground)] no-underline transition-colors hover:text-foreground">
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

function FilterChip({ icon: Icon, label, active, onClick }: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-[var(--landing-ghost-border)] bg-[var(--landing-ghost-bg)] text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}
