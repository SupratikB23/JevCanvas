// Smoke contract suite: Jev ok/fallback, diffusion ok/fallback,
// composition validity, rejection rules, cache, budgets, prompt constraints.
import { describe, expect, it } from "vitest";
import { assetUrlsById, cacheStats, clearAssetCacheForTests, generateAsset, missingAssetFallback } from "../lib/assets";
import {
  buildSpecFromCandidates, candidateRecipes, fallbackSpec, injectAssetUrls,
  planAssets, rejectInvalidActions, rejectUnknownComponents,
} from "../lib/composition";
import {
  MAX_ASSETS_PER_GENERATION, MAX_ASSETS_PER_PAGE, MAX_GENERATIONS_PER_ASSET,
  MAX_PROMPT_CHARS,
} from "../lib/constants";
import { buildDiffusionPrompt, normalizeAssetUrl, placeholderFor } from "../lib/diffusion";
import { decideAssetFit, estimateCost, extractVisionFeaturesStub } from "../lib/evaluation";
import { evaluateComposition, fallbackDecisions } from "../lib/jev";
import { SpecSchema } from "../lib/schemas";
import { clearVersionsForTests, getVersion, saveVersion } from "../lib/versions";

function okJevFetch(): typeof fetch {
  return (async () =>
    new Response(
      JSON.stringify({
        answers: {
          pageType: { choice: "dashboard" },
          needsHero: { value: true },
          needsMetrics: { value: true },
          needsChart: { value: true },
          needsTable: { value: false },
          needsTimeline: { value: false },
          needsSidebar: { value: false },
          visualStyle: { choice: "technical" },
          visualIntensity: { score: 0.6 },
          needsHeroBackground: { value: true },
          needsIllustration: { value: false },
          needsSectionDecoration: { value: false },
        },
      }),
      { status: 200 },
    )) as typeof fetch;
}

describe("smoke contracts", () => {
  it("jev request -> valid typed response", async () => {
    const r = await evaluateComposition({ prompt: "dashboard please", apiKey: "k", fetchImpl: okJevFetch() });
    expect(r.fromFallback).toBe(false);
    expect(r.decisions.pageType).toBe("dashboard");
    expect(r.questionCount).toBeGreaterThan(4);
  });

  it("jev failure -> safe fallback keeps last-valid-spec path", async () => {
    const bad = (async () => new Response("err", { status: 500 })) as unknown as typeof fetch;
    const r = await evaluateComposition({ prompt: "dashboard please", apiKey: "k", fetchImpl: bad });
    expect(r.fromFallback).toBe(true);
    expect(() => SpecSchema.parse(fallbackSpec("x"))).not.toThrow();
    expect(fallbackDecisions("music studio").pageType).toBe("workspace");
  });

  it("diffusion request -> asset ref; failure -> graceful placeholder", async () => {
    clearAssetCacheForTests();
    const good = { generate: async () => ({ url: "https://cdn.example/a.webp", model: "m", width: 100, height: 100 }) };
    const item = { id: "hero-bg", type: "HeroBackground", required: true, purpose: "Hero section background", style: "technical", aspectRatio: "16:9", seed: 1 } as const;
    const a = await generateAsset({ item, intent: "dashboard", provider: good });
    expect(a.status).toBe("ready");
    expect(a.url).toContain("https://");
    const failing = { generate: async () => { throw new Error("down"); } };
    // Distinct intent+seed so this misses the cache and exercises the failure path.
    const b = await generateAsset({ item: { ...item, id: "other", seed: 2 }, intent: "unreachable-intent", provider: failing });
    expect(b.status).toBe("failed");
    expect(b.url ?? "").toContain("data:image/svg+xml");
  });

  it("composition -> valid spec; unknown component + invalid action rejected", () => {
    const spec = buildSpecFromCandidates(candidateRecipes(fallbackDecisions("AI dashboard"), "AI dashboard"));
    expect(SpecSchema.safeParse(spec).success).toBe(true);
    expect(rejectUnknownComponents({ root: "r", elements: { r: { type: "Nope", props: {} } } })).toEqual(["r"]);
    expect(
      rejectInvalidActions({ root: "r", elements: { r: { type: "Button", props: {}, on: { press: { action: "rm -rf" } } } } }),
    ).toHaveLength(1);
  });

  it("missing asset -> fallback UI url; cache hit avoids regen", async () => {
    clearAssetCacheForTests();
    expect(missingAssetFallback("HeroBackground").url ?? "").toContain("data:image/svg+xml");
    let calls = 0;
    const counting = { generate: async () => { calls += 1; return { url: "https://cdn.example/c.webp", model: "m", width: 1, height: 1 }; } };
    const item = { id: "a", type: "Illustration", required: true, purpose: "p", style: "minimal", aspectRatio: "1:1", seed: 9 } as const;
    await generateAsset({ item, intent: "same", provider: counting });
    await generateAsset({ item, intent: "same", provider: counting });
    expect(calls).toBe(1);
    expect(cacheStats().hits).toBe(1);
  });

  it("budgets enforced; prompt builder includes constraints", () => {
    expect(MAX_PROMPT_CHARS).toBe(2000);
    expect(MAX_ASSETS_PER_GENERATION).toBeLessThanOrEqual(MAX_ASSETS_PER_PAGE);
    expect(MAX_GENERATIONS_PER_ASSET).toBe(2);
    const all = planAssets({ ...fallbackDecisions("x"), needsHeroBackground: true, needsIllustration: true, needsSectionDecoration: true });
    expect(all.length).toBeLessThanOrEqual(MAX_ASSETS_PER_GENERATION);
    const p = buildDiffusionPrompt({ intent: "dashboard", purpose: "hero", style: "technical", aspectRatio: "16:9" });
    expect(p).toMatch(/No readable text/);
    expect(p).toMatch(/No logos/);
    expect(p).toMatch(/negative space/);
    expect(placeholderFor("HeroBackground")).toContain("data:image/svg+xml");
    expect(() => normalizeAssetUrl("ftp://evil")).toThrow();
    expect(Object.keys(injectAssetUrls(fallbackSpec("x"), assetUrlsById([])).elements).length).toBeGreaterThan(0);
  });

  it("evaluation caps regens; versions persist", () => {
    clearVersionsForTests();
    const f = extractVisionFeaturesStub({ id: "h", type: "HeroBackground", status: "ready", prompt: "dark technical negative space" }, "technical");
    expect(f.dark).toBe(true);
    expect(decideAssetFit({ assetId: "h", features: { ...f, hasText: true }, generationsUsed: 1 }).decision).toBe("regenerate");
    expect(decideAssetFit({ assetId: "h", features: f, generationsUsed: 2 }).decision).toBe("fallback");
    expect(estimateCost(1_000_000, 1)).toBeGreaterThan(0);
    const v = saveVersion({ prompt: "hello", spec: fallbackSpec("hello"), assets: [] });
    expect(getVersion(v.id)?.prompt).toBe("hello");
  });
});
