import { describe, expect, it } from "vitest";

import { getDefaultParams } from "@/lib/canvas/category-meta";
import {
  DOCLING_OCR_LANGUAGE_OPTIONS,
  OCR_NODE_PARAM_DEFAULTS,
  SURYA_LANGUAGE_OPTIONS,
  getParamDefaultValue,
  getParamSchema,
  joinLanguageCodes,
  parseLanguageCodes,
  resolveParamValue,
} from "@/lib/canvas/node-param-schema";
import { validateNodeParams } from "@/lib/canvas/node-readiness";

describe("docling/ocr-auto params", () => {
  it("exposes languages as a multi-select with Docling OCR codes", () => {
    const schema = getParamSchema("docling/ocr-auto", "text_recognition");
    const langs = schema.find((field) => field.key === "langs");

    expect(langs?.type).toBe("multi-select");
    expect(langs?.options?.map((opt) => opt.value)).toContain("eng");
    expect(langs?.options?.map((opt) => opt.value)).toContain("deu");
  });

  it("uses eng as the default language", () => {
    expect(getDefaultParams("text_recognition", "docling/ocr-auto")).toEqual(
      OCR_NODE_PARAM_DEFAULTS["docling/ocr-auto"],
    );
    expect(getParamDefaultValue("docling/ocr-auto", "langs")).toBe("eng");
  });

  it("resolves legacy languages param", () => {
    expect(
      resolveParamValue("docling/ocr-auto", { languages: "fra" }, {
        key: "langs",
        label: "Language",
        type: "select",
      }),
    ).toBe("fra");
  });

  it("rejects unsupported language codes", () => {
    const issues = validateNodeParams("docling/ocr-auto", { langs: "eng,xyz" });
    expect(issues).toContain("langs must use supported language codes");
  });

  it("accepts multiple supported language codes", () => {
    const issues = validateNodeParams("docling/ocr-auto", { langs: "eng,deu,fra" });
    expect(issues).not.toContain("langs must use supported language codes");
  });
});

describe("surya/text-recognition params", () => {
  it("exposes languages as a multi-select with Surya codes", () => {
    const schema = getParamSchema("surya/text-recognition", "text_recognition");
    const langs = schema.find((field) => field.key === "langs");

    expect(langs?.type).toBe("multi-select");
    expect(langs?.options).toEqual([...SURYA_LANGUAGE_OPTIONS]);
  });

  it("uses en as the default language", () => {
    expect(getParamDefaultValue("surya/text-recognition", "langs")).toBe("en");
  });

  it("rejects unsupported language codes", () => {
    const issues = validateNodeParams("surya/text-recognition", { langs: "en,xyz" });
    expect(issues).toContain("langs must use supported language codes");
  });
});

describe("parseLanguageCodes", () => {
  it("splits comma-separated values and falls back when empty", () => {
    expect(parseLanguageCodes("en,de", "en")).toEqual(["en", "de"]);
    expect(parseLanguageCodes("eng,deu,fra", "eng")).toEqual(["eng", "deu", "fra"]);
    expect(parseLanguageCodes("", "eng")).toEqual(["eng"]);
    expect(parseLanguageCodes(undefined, "eng")).toEqual(["eng"]);
  });

  it("joins language codes for storage", () => {
    expect(joinLanguageCodes(["eng", "deu"])).toBe("eng,deu");
  });
});

describe("Docling OCR language options", () => {
  it("includes common Tesseract ISO 639-2 codes", () => {
    const values = DOCLING_OCR_LANGUAGE_OPTIONS.map((opt) => opt.value);
    expect(values).toEqual(
      expect.arrayContaining(["eng", "deu", "fra", "chi_sim", "jpn"]),
    );
  });
});
