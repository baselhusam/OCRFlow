import type { Metadata } from "next";

import { TemplatesGallery } from "@/components/templates/templates-gallery";
import { PIPELINE_TEMPLATES } from "@/lib/templates/catalog";

export const metadata: Metadata = {
  title: "Pipeline templates",
  description:
    "Start from curated OCR pipelines for invoices, receipts, IDs, contracts, and more.",
};

export default function TemplatesPage() {
  return <TemplatesGallery templates={PIPELINE_TEMPLATES} />;
}
