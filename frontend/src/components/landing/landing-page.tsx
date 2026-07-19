import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingThemeSync } from "@/components/landing/landing-theme-sync";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { FeatureGrid } from "@/components/landing/feature-grid";

export function LandingPage() {
  return (
    <div className="relative flex min-h-full flex-col bg-background text-foreground">
      <LandingThemeSync />
      <div className="ocrflow-landing-backdrop ocrflow-landing-backdrop-dots" />
      <div className="ocrflow-landing-backdrop ocrflow-landing-backdrop-glow" />

      <LandingHeader />
      <main className="relative z-[1] flex flex-1 flex-col">
        <LandingHero />
        <PipelinePreview />
        <FeatureGrid />
      </main>
      <LandingFooter />
    </div>
  );
}
