import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateDetailView } from "@/components/templates/template-detail-view";
import {
  PIPELINE_TEMPLATES,
  getTemplateBySlug,
} from "@/lib/templates/catalog";

type TemplatePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ add?: string }>;
};

export function generateStaticParams() {
  return PIPELINE_TEMPLATES.map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) {
    return { title: "Template" };
  }
  return {
    title: template.name,
    description: template.summary,
  };
}

export default async function TemplateDetailPage({
  params,
  searchParams,
}: TemplatePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const template = getTemplateBySlug(slug);
  if (!template) {
    notFound();
  }

  return (
    <TemplateDetailView
      template={template}
      autoAdd={query.add === "1"}
    />
  );
}
