import Link from "next/link";

import { AddToPipelinesButton } from "@/components/templates/add-to-pipelines-button";
import { TemplateFlowPreview } from "@/components/templates/template-flow-preview";
import { TemplateGlyph } from "@/components/templates/template-glyph";
import type { PipelineTemplate } from "@/lib/templates/catalog";
import { TEMPLATE_CATEGORY_LABELS } from "@/lib/templates/catalog";

type TemplateDetailViewProps = {
  template: PipelineTemplate;
  autoAdd?: boolean;
};

function BackIcon() {
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
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function TemplateDetailView({
  template,
  autoAdd = false,
}: TemplateDetailViewProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-8 pb-24 pt-6">
      <Link
        href="/templates"
        className="inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.08em] text-muted-foreground no-underline uppercase transition-colors hover:text-foreground"
      >
        <BackIcon />
        All templates
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-[11px] bg-primary/10 text-primary">
              <TemplateGlyph template={template} />
            </span>
            <span className="rounded-[5px] border border-[var(--landing-hairline)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground uppercase">
              {TEMPLATE_CATEGORY_LABELS[template.category]}
            </span>
            {template.featured ? (
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Featured
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground">
            {template.name}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--subtle-foreground)]">
            {template.description}
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] p-4">
              <dt className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                Best for
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-foreground">
                {template.bestFor}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] p-4">
              <dt className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                Input
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-foreground">
                {template.inputHint}
              </dd>
            </div>
          </dl>

          <p className="mt-8 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Fields this pipeline is built to recover
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {template.fields.map((field) => (
              <li
                key={field.key}
                className="rounded-md border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] px-3 py-1.5 font-mono text-[12px] tracking-wide text-foreground"
              >
                {field.label}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <AddToPipelinesButton slug={template.slug} autoAdd={autoAdd} />
            <p className="text-sm text-muted-foreground">
              Sign in if needed — the pipeline is created in your account only.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--landing-node-border)] bg-[var(--landing-node-bg)] p-6">
          <p className="font-mono text-[11px] tracking-[0.16em] text-primary uppercase">
            Graph
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Added as a ready pipeline. Open it on the canvas to swap models,
            then apply it to a job of documents.
          </p>
          <div className="mt-5">
            <TemplateFlowPreview template={template} />
          </div>
          <ol className="mt-6 space-y-3">
            {template.graph.nodes.map((node, index) => (
              <li key={node.id} className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-[11px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {node.modelId}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Stage {index + 1} of {template.graph.nodes.length}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
