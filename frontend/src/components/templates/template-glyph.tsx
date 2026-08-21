import type { PipelineTemplate, TemplateCategory } from "@/lib/templates/catalog";

type TemplateGlyphProps = {
  className?: string;
};

type Glyph = (props: TemplateGlyphProps) => React.JSX.Element;

function InvoiceGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M10 12h6M10 16h4" />
    </svg>
  );
}

function ReceiptGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 3v18l2.5-1.5L12 21l2.5-1.5L17 21V3l-2.5 1.5L12 3 9.5 4.5z" />
      <path d="M10 10h4M10 14h3" />
    </svg>
  );
}

function TableGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M4 10h16M10 5v14" />
    </svg>
  );
}

function IdGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M13 11h5M13 14h3.5" />
    </svg>
  );
}

function ContractGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4M10 13h6M10 17h4" />
    </svg>
  );
}

function FormGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function PaperGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4h9l4 4v12H6z" />
      <path d="M15 4v4h4M9 12h7M9 16h5" />
    </svg>
  );
}

function FormulaGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 8h6M8 8v10M5 18h6" />
      <path d="M14 8l6 10M20 8l-6 10" />
    </svg>
  );
}

function FigureGlyph({ className }: TemplateGlyphProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="m4 16 5-5 4 4 3-3 4 4" />
      <circle cx="9" cy="9" r="1.2" />
    </svg>
  );
}

const SLUG_ICONS: Record<string, Glyph> = {
  "invoice-extraction": InvoiceGlyph,
  "receipt-expenses": ReceiptGlyph,
  "bank-statements": TableGlyph,
  "identity-kyc": IdGlyph,
  "contract-text": ContractGlyph,
  "form-capture": FormGlyph,
  "academic-papers": PaperGlyph,
  "stem-formulas": FormulaGlyph,
  "figure-captions": FigureGlyph,
};

const CATEGORY_ICONS: Record<TemplateCategory, Glyph> = {
  finance: InvoiceGlyph,
  identity: IdGlyph,
  documents: FormGlyph,
  research: PaperGlyph,
  visual: FigureGlyph,
};

export function TemplateGlyph({
  template,
  className,
}: {
  template: PipelineTemplate;
  className?: string;
}) {
  const Icon = SLUG_ICONS[template.slug] ?? CATEGORY_ICONS[template.category];
  return <Icon className={className} />;
}
