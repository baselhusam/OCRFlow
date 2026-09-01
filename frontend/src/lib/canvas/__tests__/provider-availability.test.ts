import { describe, expect, it } from "vitest";

import {
  buildOfflineProviderSet,
  getModelRuntimeStatus,
  isProviderOffline,
  providerOfflineMessage,
} from "@/lib/canvas/provider-availability";
import type { ModelCatalogEntry, RuntimeAvailability } from "@/lib/canvas/types";

function runtime(
  providers: Array<{ provider: string; running: boolean; models?: string[] }>,
  mode = "remote",
): RuntimeAvailability {
  return {
    mode,
    providers: providers.map((p) => ({
      provider: p.provider,
      running: p.running,
      mode,
      detail: null,
      models: p.models,
    })),
  };
}

function model(
  provider: string,
  id = `${provider}/model`,
): Pick<ModelCatalogEntry, "id" | "provider"> {
  return { provider, id };
}

describe("buildOfflineProviderSet", () => {
  it("collects remote providers that are not running", () => {
    const offline = buildOfflineProviderSet(
      runtime([
        { provider: "paddle", running: true },
        { provider: "docling", running: false },
        { provider: "surya", running: false },
      ]),
    );
    expect(offline.has("docling")).toBe(true);
    expect(offline.has("surya")).toBe(true);
    expect(offline.has("paddle")).toBe(false);
  });

  it("ignores non-remote providers even if reported not running", () => {
    const offline = buildOfflineProviderSet(
      runtime([{ provider: "loader", running: false }]),
    );
    expect(offline.size).toBe(0);
  });

  it("degrades closed when runtime is null (remote providers unavailable)", () => {
    const offline = buildOfflineProviderSet(null);
    expect(offline.has("docling")).toBe(true);
    expect(offline.has("surya")).toBe(true);
    expect(offline.has("paddle")).toBe(true);
  });

  it("treats local mode as everything running", () => {
    const offline = buildOfflineProviderSet(
      runtime(
        [
          { provider: "paddle", running: true },
          { provider: "docling", running: true },
          { provider: "surya", running: true },
        ],
        "local",
      ),
    );
    expect(offline.size).toBe(0);
  });
});

describe("getModelRuntimeStatus", () => {
  it("marks a model offline with a start-service hint", () => {
    const availability = runtime([{ provider: "docling", running: false }]);
    const status = getModelRuntimeStatus(model("docling"), availability);
    expect(status.offline).toBe(true);
    expect(status.message).toBe(providerOfflineMessage("docling"));
    expect(status.message).toContain("Docling");
  });

  it("leaves online providers available", () => {
    const availability = runtime([{ provider: "paddle", running: true }]);
    const status = getModelRuntimeStatus(model("paddle"), availability);
    expect(status.offline).toBe(false);
    expect(status.message).toBeUndefined();
  });

  it("marks a model unavailable when a partial engine did not pass its API check", () => {
    const availability = runtime([
      { provider: "surya", running: true, models: ["surya/layout"] },
    ]);
    const status = getModelRuntimeStatus(
      model("surya", "surya/text-recognition"),
      availability,
    );
    expect(status.offline).toBe(true);
    expect(status.message).toContain("not available");
  });
});

describe("isProviderOffline", () => {
  it("reflects membership in the offline set", () => {
    const offline = new Set(["surya"]);
    expect(isProviderOffline("surya", offline)).toBe(true);
    expect(isProviderOffline("paddle", offline)).toBe(false);
  });
});
