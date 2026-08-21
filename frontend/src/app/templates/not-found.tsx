import Link from "next/link";

export default function TemplateNotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-24 text-center">
      <p className="font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
        Templates
      </p>
      <h1 className="mt-4 text-[36px] font-extrabold tracking-[-0.03em] text-foreground">
        Template not found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        That pipeline template is not in the catalog.
      </p>
      <Link
        href="/templates"
        className="mt-8 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground no-underline"
      >
        Browse templates
      </Link>
    </div>
  );
}
