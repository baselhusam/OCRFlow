import type { Metadata } from "next";

import { PageContainer } from "@/components/app/page-header";
import { EngineConfiguration } from "@/components/configuration/engine-configuration";

export const metadata: Metadata = {
  title: "Configuration",
};

export default function ConfigurationPage() {
  return (
    <PageContainer width="default">
      <EngineConfiguration />
    </PageContainer>
  );
}
