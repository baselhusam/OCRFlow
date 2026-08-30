import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsNavList } from "@/components/docs/docs-nav-list";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsToc } from "@/components/docs/docs-toc";
import { loadDocsPage } from "@/lib/docs/load";
import { flattenDocsNav, getAdjacentDocs } from "@/lib/docs/nav";

export const dynamicParams = false;

const MODEL_PAGE_META = {
  docling: {
    provider: "docling",
    label: "Document intelligence provider",
    logoClassName: "size-[52px]",
    markClassName: "border-[#f0c66d]/60 bg-[#fff8ea] dark:border-[#b9761d]/45 dark:bg-[#2c241a]",
  },
  surya: {
    provider: "surya",
    label: "Modular OCR provider",
    logoClassName: "size-[43px]",
    markClassName: "border-stone-300 bg-stone-50 dark:border-[#776c4f] dark:bg-[#e8ddbd]",
  },
  paddle: {
    provider: "paddle",
    label: "PaddleOCR provider",
    logoClassName: "w-[56px]",
    markClassName: "border-[#b9c1ff] bg-[#f1f3ff] dark:border-[#5b6ee5]/60 dark:bg-[#dce1ff]",
  },
} as const;

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

function slugFromParams(slug?: string[]): string {
  return slug?.join("/") ?? "";
}

export function generateStaticParams() {
  return flattenDocsNav().map((item) => ({
    slug: item.slug === "" ? [] : item.slug.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = loadDocsPage(slugFromParams(slug));
  if (!page) {
    return { title: "Documentation — OCRFlow" };
  }
  return {
    title: `${page.title} — OCRFlow Docs`,
    description: page.description,
  };
}

export default async function DocumentationPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const page = loadDocsPage(slugFromParams(slug));
  if (!page) notFound();

  const adjacent = getAdjacentDocs(page.slug);
  const modelMeta = MODEL_PAGE_META[page.slug as keyof typeof MODEL_PAGE_META];

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)_214px]">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-r border-border px-3 pt-5 lg:block">
        <DocsNavList currentSlug={page.slug} />
      </aside>
      <article className="min-w-0 px-4 py-10 sm:px-8 lg:px-10 xl:px-12">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" />
          {page.section}
        </p>
        {modelMeta ? (
          <div className="mb-1 flex items-center gap-4 sm:gap-5">
            <div className={`flex size-[70px] shrink-0 items-center justify-center rounded-[18px] border shadow-[0_8px_20px_-14px_color-mix(in_srgb,var(--foreground)_38%,transparent)] ${modelMeta.markClassName}`}>
              <ProviderLogo
                provider={modelMeta.provider}
                size={56}
                className={modelMeta.logoClassName}
              />
            </div>
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {modelMeta.label}
              </p>
              <h1 className="text-[32px] font-bold tracking-[-0.025em] text-foreground">
                {page.title}
              </h1>
            </div>
          </div>
        ) : (
          <h1 className="text-[32px] font-bold tracking-[-0.025em] text-foreground">
            {page.title}
          </h1>
        )}
        <p className="mt-3 max-w-[42rem] text-[17px] leading-[1.55] text-[var(--subtle-foreground)]">
          {page.description}
        </p>
        <div className="mt-8 xl:hidden">
          <DocsToc headings={page.headings} />
        </div>
        <div className="mt-8">
          <DocsMarkdown content={page.content} />
        </div>
        <DocsPager previous={adjacent.previous} next={adjacent.next} />
      </article>
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-6 xl:block">
        <DocsToc headings={page.headings} />
      </aside>
    </div>
  );
}
