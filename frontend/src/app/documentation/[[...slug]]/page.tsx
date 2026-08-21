import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsNavList } from "@/components/docs/docs-nav-list";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsToc } from "@/components/docs/docs-toc";
import { loadDocsPage } from "@/lib/docs/load";
import { flattenDocsNav, getAdjacentDocs } from "@/lib/docs/nav";

export const dynamicParams = false;

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

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)_214px]">
      <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-border px-3 pt-6 lg:block">
        <DocsNavList currentSlug={page.slug} />
      </aside>
      <article className="min-w-0 px-4 py-10 sm:px-8 lg:px-10 xl:px-12">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" />
          {page.section}
        </p>
        <h1 className="text-[32px] font-bold tracking-[-0.025em] text-foreground">
          {page.title}
        </h1>
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
      <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto py-10 pr-6 xl:block">
        <DocsToc headings={page.headings} />
      </aside>
    </div>
  );
}
