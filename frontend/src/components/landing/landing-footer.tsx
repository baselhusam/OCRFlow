const footerLinks = [
  { label: "MIT LICENSE", href: "https://github.com/baselhusam/OCRFlow/blob/main/LICENSE" },
  { label: "DOCS", href: "/documentation" },
  { label: "GITHUB", href: "https://github.com/baselhusam/OCRFlow" },
  { label: "COMMUNITY", href: "https://github.com/baselhusam/OCRFlow/issues" },
];

export function LandingFooter() {
  return (
    <footer className="relative z-[2] flex flex-wrap items-center justify-between gap-4 border-t border-[var(--landing-hairline)] px-8 py-5">
      <div className="flex flex-wrap gap-x-[22px] gap-y-2">
        {footerLinks.map((link) => {
          const external = link.href.startsWith("http");
          return (
            <a
              key={link.label}
              href={link.href}
              className="font-mono text-[11px] tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {link.label}
            </a>
          );
        })}
      </div>
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
        Detect&nbsp;·&nbsp;Recognize&nbsp;·&nbsp;Extract
      </p>
    </footer>
  );
}
