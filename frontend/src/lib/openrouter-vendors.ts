import type { OcrModel } from "@/lib/api/model-connections";

/**
 * The company behind an OpenRouter model ("qwen/qwen2.5-vl" -> qwen), with a
 * display name and logo. Logos live in /public/models_logos/vendors (LobeHub
 * icons, MIT); vendors without one get a monogram tile.
 */

/** OpenRouter slugs that belong to the same company. */
const ALIASES: Record<string, string> = {
  "meta-llama": "meta",
  "bytedance-seed": "bytedance",
};

const LABELS: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
  qwen: "Qwen",
  anthropic: "Anthropic",
  mistralai: "Mistral AI",
  meta: "Meta",
  "z-ai": "Z.ai",
  "x-ai": "xAI",
  moonshotai: "Moonshot AI",
  nvidia: "NVIDIA",
  amazon: "Amazon",
  perplexity: "Perplexity",
  sakana: "Sakana AI",
  xiaomi: "Xiaomi",
  bytedance: "ByteDance",
  deepseek: "DeepSeek",
  minimax: "MiniMax",
  stepfun: "StepFun",
  tencent: "Tencent",
  cohere: "Cohere",
  fireworks: "Fireworks",
  rekaai: "Reka",
};

const LOGOS = new Set([
  "openai", "google", "qwen", "anthropic", "mistralai", "meta", "z-ai", "x-ai",
  "moonshotai", "nvidia", "amazon", "perplexity", "sakana", "xiaomi", "bytedance",
  "deepseek", "minimax", "stepfun", "tencent", "cohere", "fireworks", "rekaai",
]);

export function vendorKey(modelId: string): string {
  const raw = modelId.replace(/^~/, "").split("/", 1)[0]?.toLowerCase() ?? modelId;
  return ALIASES[raw] ?? raw;
}

/** Prefer our label, then the "Vendor: Model" prefix OpenRouter uses in names. */
export function vendorLabel(key: string, sampleName?: string): string {
  if (LABELS[key]) return LABELS[key];
  const prefix = sampleName?.includes(": ") ? sampleName.split(": ", 1)[0] : null;
  if (prefix) return prefix;
  return key.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function vendorLogo(key: string): string | null {
  return LOGOS.has(key) ? `/models_logos/vendors/${key}.svg` : null;
}

export type VendorGroup<T extends Pick<OcrModel, "id" | "name">> = {
  key: string;
  label: string;
  logo: string | null;
  models: T[];
};

/** Models grouped by vendor, vendors alphabetical, model order preserved. */
export function groupByVendor<T extends Pick<OcrModel, "id" | "name">>(models: T[]): VendorGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const model of models) {
    const key = vendorKey(model.id);
    const list = groups.get(key) ?? [];
    list.push(model);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, label: vendorLabel(key, list[0]?.name), logo: vendorLogo(key), models: list }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
