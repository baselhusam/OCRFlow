import { describe, expect, it } from "vitest";

import { groupByVendor, vendorKey, vendorLabel, vendorLogo } from "@/lib/openrouter-vendors";

describe("OpenRouter vendor grouping", () => {
  it("folds slug aliases into one vendor", () => {
    expect(vendorKey("meta-llama/llama-4-maverick")).toBe("meta");
    expect(vendorKey("bytedance-seed/seed-1.6")).toBe("bytedance");
    expect(vendorKey("~openai/gpt-latest")).toBe("openai");
  });

  it("labels known vendors and falls back to the model-name prefix", () => {
    expect(vendorLabel("mistralai")).toBe("Mistral AI");
    expect(vendorLabel("nex-agi", "Nex AGI: Nex N1")).toBe("Nex AGI");
    expect(vendorLogo("qwen")).toBe("/models_logos/vendors/qwen.svg");
    expect(vendorLogo("nex-agi")).toBeNull();
  });

  it("groups models by vendor alphabetically and keeps model order", () => {
    const groups = groupByVendor([
      { id: "qwen/b", name: "Qwen: B" },
      { id: "google/a", name: "Google: A" },
      { id: "qwen/a", name: "Qwen: A" },
    ]);
    expect(groups.map((group) => group.label)).toEqual(["Google", "Qwen"]);
    expect(groups[1].models.map((model) => model.id)).toEqual(["qwen/b", "qwen/a"]);
  });
});
