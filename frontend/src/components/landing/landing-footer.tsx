const footerLinks = [
  { label: "MIT LICENSE", href: "#" },
  { label: "DOCS", href: "#" },
  { label: "GITHUB", href: "#" },
  { label: "COMMUNITY", href: "#" },
];

export function LandingFooter() {
  return (
    <footer className="relative z-[2] flex flex-wrap items-center justify-between gap-4 border-t border-[var(--landing-hairline)] px-8 py-5">
      <div className="flex flex-wrap gap-x-[22px] gap-y-2">
        {footerLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="font-mono text-[11px] tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
        Detect&nbsp;·&nbsp;Recognize&nbsp;·&nbsp;Extract
      </p>
    </footer>
  );
}
