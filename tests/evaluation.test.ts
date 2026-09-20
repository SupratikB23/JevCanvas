import { describe, expect, it } from "vitest";
import { decideAssetFit, emptyTelemetry, estimateCost, extractVisionFeaturesStub } from "../lib/evaluation";

describe("evaluation loop", () => {
  it("stub separates vision features from jev judgment", () => {
    const f = extractVisionFeaturesStub(
      { id: "h", type: "HeroBackground", status: "ready", prompt: "dark technical negative space" },
      "technical",
    );
    expect(f.matchesStyle).toBe(true);
    expect(f.negativeSpace).toBe(true);
  });

  it("accept / regenerate / fallback with 1-regen cap", () => {
    const good = { hasText: false, dark: true, negativeSpace: true, matchesStyle: true };
    expect(decideAssetFit({ assetId: "a", features: good, generationsUsed: 1 }).decision).toBe("accept");
    expect(decideAssetFit({ assetId: "a", features: { ...good, hasText: true }, generationsUsed: 1 }).decision).toBe("regenerate");
    expect(decideAssetFit({ assetId: "a", features: { ...good, hasText: true }, generationsUsed: 2 }).decision).toBe("fallback");
  });

  it("telemetry carries latency/cost/counts", () => {
    const t = { ...emptyTelemetry(), jevCalls: 1, diffusionCalls: 2, estCostUsd: estimateCost(500_000, 2) };
    expect(t.estCostUsd).toBeGreaterThan(0);
  });
});
