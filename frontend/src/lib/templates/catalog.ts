import { getDefaultParams } from "@/lib/canvas/category-meta";
import type { PipelineGraph } from "@/lib/canvas/types";

export type TemplateCategory =
  | "finance"
  | "identity"
  | "documents"
  | "research"
  | "visual";

export type TemplateField = {
  key: string;
  label: string;
};

export type PipelineTemplate = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  category: TemplateCategory;
  featured?: boolean;
  accentColor: string;
  fields: TemplateField[];
  bestFor: string;
  inputHint: string;
  graph: PipelineGraph;
};

const MODEL_CATEGORIES: Record<string, string> = {
  "docling/layout-heron": "layout_detection",
  "surya/layout": "layout_detection",
  "surya/text-detection": "text_detection",
  "surya/text-recognition": "text_recognition",
  "docling/ocr-auto": "text_recognition",
  "surya/reading-order": "reading_order",
  "docling/tableformer-accurate": "table_structure",
  "surya/table-recognition": "table_structure",
  "docling/code-formula-v2": "formula_recognition",
  "surya/latex-ocr": "formula_recognition",
  "docling/picture-classifier-v2.5": "figure_classification",
  "docling/picture-description-smolvlm": "figure_captioning",
};

const NODE_GAP_X = 300;
const NODE_Y = 110;

function nodeIdFor(modelId: string, index: number): string {
  const slug = modelId.split("/")[1]?.replace(/[^a-z0-9]+/gi, "-") ?? "node";
  return `${slug}-${index + 1}`;
}

export function buildModelChain(modelIds: string[]): PipelineGraph {
  const nodes = modelIds.map((modelId, index) => ({
    id: nodeIdFor(modelId, index),
    modelId,
    position: { x: 48 + index * NODE_GAP_X, y: NODE_Y },
    config: getDefaultParams(MODEL_CATEGORIES[modelId] ?? "", modelId),
  }));

  const edges = modelIds.slice(1).map((_, index) => ({
    id: `e-${index + 1}`,
    source: nodes[index].id,
    target: nodes[index + 1].id,
  }));

  return {
    nodes,
    edges,
    viewport: { x: 24, y: 40, zoom: 0.82 },
  };
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  finance: "Finance",
  identity: "Identity",
  documents: "Documents",
  research: "Research",
  visual: "Visual",
};

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    slug: "invoice-extraction",
    name: "Invoice extraction",
    featured: true,
    category: "finance",
    accentColor: "#5B2EEF",
    summary:
      "Parse vendor invoices and pull the fields AP teams actually need.",
    description:
      "Detect invoice layout, then OCR header and line-item text. Apply it as a job and upload a batch of PDFs or scans — vendor, invoice number, dates, currency, tax, totals, and line items land in the recognised output.",
    bestFor: "Accounts payable, vendor bills, multi-invoice batches",
    inputHint: "PDF or image invoices",
    fields: [
      { key: "vendor", label: "Vendor" },
      { key: "invoice_number", label: "Invoice number" },
      { key: "invoice_date", label: "Date" },
      { key: "currency", label: "Currency" },
      { key: "subtotal", label: "Subtotal" },
      { key: "tax", label: "Tax" },
      { key: "total", label: "Amount due" },
      { key: "line_items", label: "Line items" },
    ],
    graph: buildModelChain([
      "docling/layout-heron",
      "surya/text-detection",
      "surya/text-recognition",
    ]),
  },
  {
    slug: "receipt-expenses",
    name: "Receipt & expenses",
    category: "finance",
    accentColor: "#5B2EEF",
    summary: "Capture merchant, totals, and tax from expense receipts.",
    description:
      "Layout detection plus OCR for thermal and paper receipts. Drop a folder of receipts onto a job to extract merchant, date, currency, tax, and the amount paid.",
    bestFor: "Expense reports, reimbursements, card matching",
    inputHint: "Phone photos or PDF receipts",
    fields: [
      { key: "merchant", label: "Merchant" },
      { key: "purchase_date", label: "Date" },
      { key: "currency", label: "Currency" },
      { key: "tax", label: "Tax" },
      { key: "total", label: "Total" },
      { key: "payment_method", label: "Payment method" },
    ],
    graph: buildModelChain([
      "surya/layout",
      "surya/text-detection",
      "surya/text-recognition",
    ]),
  },
  {
    slug: "bank-statements",
    name: "Bank statement tables",
    category: "finance",
    accentColor: "#5B2EEF",
    summary: "Recover transaction tables from monthly statements.",
    description:
      "Find statement layout then reconstruct rows and columns so dates, descriptions, amounts, and running balances stay aligned. Run it across a month of statements as one job.",
    bestFor: "Bookkeeping, reconciliation, audit packs",
    inputHint: "PDF bank or card statements",
    fields: [
      { key: "account_holder", label: "Account holder" },
      { key: "period", label: "Statement period" },
      { key: "opening_balance", label: "Opening balance" },
      { key: "transactions", label: "Transactions" },
      { key: "closing_balance", label: "Closing balance" },
    ],
    graph: buildModelChain([
      "docling/layout-heron",
      "docling/tableformer-accurate",
    ]),
  },
  {
    slug: "identity-kyc",
    name: "Identity documents",
    category: "identity",
    accentColor: "#5B2EEF",
    summary: "Read passports, IDs, and KYC scans into typed text.",
    description:
      "Direct page OCR tuned for identity cards and passports. Upload a batch of scans and collect name, document number, dates, nationality, and address from the recognised text.",
    bestFor: "KYC onboarding, HR files, access control",
    inputHint: "ID card or passport scans",
    fields: [
      { key: "full_name", label: "Full name" },
      { key: "document_number", label: "Document number" },
      { key: "date_of_birth", label: "Date of birth" },
      { key: "expiry_date", label: "Expiry" },
      { key: "nationality", label: "Nationality" },
      { key: "address", label: "Address" },
    ],
    graph: buildModelChain(["docling/ocr-auto", "surya/text-recognition"]),
  },
  {
    slug: "contract-text",
    name: "Contract & legal text",
    category: "documents",
    accentColor: "#5B2EEF",
    summary: "Turn scanned agreements into searchable, ordered text.",
    description:
      "Layout detection plus reading order so clauses stay in sequence. Apply the pipeline to a job of contracts to extract parties, dates, governing law, and the full clause text.",
    bestFor: "Legal review, due diligence, contract intake",
    inputHint: "Scanned or born-digital PDFs",
    fields: [
      { key: "parties", label: "Parties" },
      { key: "effective_date", label: "Effective date" },
      { key: "governing_law", label: "Governing law" },
      { key: "term", label: "Term" },
      { key: "clauses", label: "Clauses" },
    ],
    graph: buildModelChain(["surya/layout", "surya/reading-order"]),
  },
  {
    slug: "form-capture",
    name: "Form field capture",
    category: "documents",
    accentColor: "#5B2EEF",
    summary: "OCR applications, surveys, and filled paper forms.",
    description:
      "Locate fields on the page, then recognise handwritten or printed answers. Batch-upload applications and collect applicant name, IDs, dates, and checkbox-style responses from the text lines.",
    bestFor: "Applications, onboarding packs, surveys",
    inputHint: "Filled PDF or scanned forms",
    fields: [
      { key: "applicant", label: "Applicant" },
      { key: "reference", label: "Reference" },
      { key: "dates", label: "Dates" },
      { key: "answers", label: "Field answers" },
    ],
    graph: buildModelChain([
      "docling/layout-heron",
      "surya/text-detection",
      "surya/text-recognition",
    ]),
  },
  {
    slug: "academic-papers",
    name: "Academic paper parse",
    category: "research",
    accentColor: "#5B2EEF",
    summary: "Keep paper reading order, titles, and body structure.",
    description:
      "Detect sections then restore reading order across columns. Use it on a corpus of papers to recover title, authors, abstract, headings, and body text in the right sequence.",
    bestFor: "Literature review, archives, research ops",
    inputHint: "Multi-column PDF papers",
    fields: [
      { key: "title", label: "Title" },
      { key: "authors", label: "Authors" },
      { key: "abstract", label: "Abstract" },
      { key: "sections", label: "Sections" },
      { key: "references", label: "References" },
    ],
    graph: buildModelChain(["surya/layout", "surya/reading-order"]),
  },
  {
    slug: "stem-formulas",
    name: "Formula & STEM extract",
    category: "research",
    accentColor: "#5B2EEF",
    summary: "Find equations on the page and convert them to LaTeX.",
    description:
      "Layout first, then formula recognition. Batch homework, papers, or worksheets to collect displayed equations as LaTeX alongside the surrounding problem text.",
    bestFor: "STEM papers, worksheets, lecture notes",
    inputHint: "Pages with printed equations",
    fields: [
      { key: "formulas", label: "LaTeX formulas" },
      { key: "problem_text", label: "Problem text" },
      { key: "figure_labels", label: "Figure labels" },
    ],
    graph: buildModelChain(["surya/layout", "surya/latex-ocr"]),
  },
  {
    slug: "figure-captions",
    name: "Figure & chart captions",
    category: "visual",
    accentColor: "#5B2EEF",
    summary: "Classify figures then describe charts, photos, and diagrams.",
    description:
      "Detect figure regions, classify them, then generate captions. Run it over a document set when you need alt text, chart summaries, or a figure inventory.",
    bestFor: "Accessibility, cataloguing, report figures",
    inputHint: "PDFs with photos, plots, or diagrams",
    fields: [
      { key: "figure_type", label: "Figure type" },
      { key: "caption", label: "Caption" },
      { key: "description", label: "Description" },
    ],
    graph: buildModelChain([
      "surya/layout",
      "docling/picture-classifier-v2.5",
      "docling/picture-description-smolvlm",
    ]),
  },
];

export function getTemplateBySlug(slug: string): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find((template) => template.slug === slug);
}

export function listTemplateCategories(): TemplateCategory[] {
  const seen = new Set<TemplateCategory>();
  for (const template of PIPELINE_TEMPLATES) {
    seen.add(template.category);
  }
  return [...seen];
}

export function templateStageLabel(modelId: string): string {
  return modelId.split("/").pop()?.replace(/-/g, " ") ?? modelId;
}

