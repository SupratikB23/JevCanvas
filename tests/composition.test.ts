import { describe, expect, it } from "vitest";
import {
  buildSpecFromCandidates, candidateRecipes, fallbackSpec, injectAssetUrls,
  isAllowedAction, isKnownComponent, planAssets, rejectInvalidActions,
  rejectUnknownComponents, validateWithJsonRender,
} from "../lib/composition";
import { fallbackDecisions } from "../lib/jev";
import { SpecSchema } from "../lib/schemas";

describe("composition", () => {
  it("decisions -> valid catalog-constrained spec", async () => {
    const d = fallbackDecisions("futuristic AI dashboard with metrics and chart");
    const spec = buildSpecFromCandidates(candidateRecipes(d, "futuristic AI dashboard"));
    expect(SpecSchema.safeParse(spec).success).toBe(true);
    expect(await validateWithJsonRender(spec)).toBe(true);
    expect(isKnownComponent("Hero")).toBe(true);
    expect(isKnownComponent("CoolAnalyticsThing")).toBe(false);
  });

  it("rejects unknown components and invalid actions", () => {
    expect(rejectUnknownComponents({ root: "r", elements: { r: { type: "X", props: {} } } })).toEqual(["r"]);
    expect(isAllowedAction("navigate")).toBe(true);
    expect(isAllowedAction("execArbitrary")).toBe(false);
    const bad = { root: "r", elements: { r: { type: "Button", props: {}, on: { press: { action: "execArbitrary" } } } } };
    expect(rejectInvalidActions(bad)).toHaveLength(1);
  });

  it("plans at most 3 assets and injects urls deterministically", () => {
    const d = { ...fallbackDecisions("x"), needsHeroBackground: true, needsIllustration: true, needsSectionDecoration: true };
    expect(planAssets(d).length).toBeLessThanOrEqual(3);
    const spec = injectAssetUrls(fallbackSpec("x"), { "hero-bg": "https://cdn.example/h.webp" });
    expect(JSON.stringify(spec)).toContain("https://cdn.example/h.webp");
  });
});
