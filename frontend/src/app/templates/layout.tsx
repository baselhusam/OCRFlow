import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingThemeSync } from "@/components/landing/landing-theme-sync";

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col bg-background text-foreground">
      <LandingThemeSync />
      <div className="ocrflow-landing-backdrop ocrflow-landing-backdrop-dots" />
      <div className="ocrflow-landing-backdrop ocrflow-landing-backdrop-glow" />
      <LandingHeader />
      <main className="relative z-[1] flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
