import type { Metadata } from "next";
import { EngineConfiguration } from "@/components/configuration/engine-configuration";

export const metadata: Metadata = {
  title: "Configuration",
};

export default function ConfigurationPage() {
  return <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-11 md:px-12"><EngineConfiguration /></main>;
}
