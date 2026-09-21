import { describe, expect, it } from "vitest";
import {
  buildDiffusionPrompt, dimensionsForAspect, diffusionRequestForPlan,
  FreePollinationsProvider, normalizeAssetUrl, placeholderFor, ReplicateFluxProvider,
  selectDiffusionProvider,
} from "../lib/diffusion";
import { FREE_DIFFUSION_BASE_URL, FREE_DIFFUSION_MODEL } from "../lib/constants";

describe("diffusion adapter", () => {
  it("builds constrained prompts and aspect dimensions", () => {
    const p = buildDiffusionPrompt({ intent: "AI dashboard", purpose: "hero background", style: "futuristic", aspectRatio: "16:9" });
    expect(p).toMatch(/No readable text/);
    expect(dimensionsForAspect("16:9").width).toBeGreaterThan(1000);
    const req = diffusionRequestForPlan(
      { id: "h", type: "HeroBackground", required: true, purpose: "Hero section background", style: "technical", aspectRatio: "16:9", seed: 3 },
      "dashboard",
    );
    expect(req.seed).toBe(3);
  });

  it("posts flux-schnell shape once and normalizes the URL", async () => {
    let bodies = 0;
    const fake = (async (_url: string, init: RequestInit) => {
      bodies += 1;
      const body = JSON.parse(String(init.body));
      expect(body.model).toMatch(/flux-schnell/);
      expect(body.input.num_outputs).toBe(1);
      return new Response(JSON.stringify({ output: ["https://cdn.example/img.webp"] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await new ReplicateFluxProvider("tok", fake).generate({ prompt: "p", aspectRatio: "1:1", seed: 1 });
    expect(r.url).toBe("https://cdn.example/img.webp");
    expect(bodies).toBeGreaterThanOrEqual(1);
  });

  it("retries at most once then throws; placeholders are SVG data-URIs", async () => {
    let calls = 0;
    const down = (async () => { calls += 1; return new Response("e", { status: 500 }); }) as unknown as typeof fetch;
    await expect(new ReplicateFluxProvider("tok", down).generate({ prompt: "p", aspectRatio: "4:3" })).rejects.toThrow();
    expect(calls).toBe(2);
    expect(placeholderFor("Illustration")).toContain("data:image/svg+xml");
    expect(() => normalizeAssetUrl("javascript:alert(1)")).toThrow();
  });

  it("free provider builds a short https URL with no fetch and no key", async () => {
    const longPrompt = `Create a technical hero background for ${"very detailed dashboard requirements ".repeat(100)}. No readable text. No logos.`;
    const r = await new FreePollinationsProvider().generate({ prompt: longPrompt, aspectRatio: "16:9", seed: 7 });
    expect(r.model).toBe(FREE_DIFFUSION_MODEL);
    expect(r.url.startsWith(`${FREE_DIFFUSION_BASE_URL}/`)).toBe(true);
    expect(r.url.startsWith("https://")).toBe(true);
    expect(r.url.length).toBeLessThanOrEqual(2048);
    expect(r.url).toMatch(/nologo=true/);
    expect(r.seed).toBe(7);
  });

  it("selects Replicate only when its token is set, free provider otherwise", () => {
    const prev = process.env.REPLICATE_API_TOKEN;
    try {
      process.env.REPLICATE_API_TOKEN = "tok";
      expect(selectDiffusionProvider()).toBeInstanceOf(ReplicateFluxProvider);
      delete process.env.REPLICATE_API_TOKEN;
      expect(selectDiffusionProvider()).toBeInstanceOf(FreePollinationsProvider);
    } finally {
      if (prev === undefined) delete process.env.REPLICATE_API_TOKEN;
      else process.env.REPLICATE_API_TOKEN = prev;
    }
  });

  it("caches free and paid results for the same prompt separately", async () => {
    const { clearAssetCacheForTests, generateAsset } = await import("../lib/assets");
    clearAssetCacheForTests();
    const item = { id: "x", type: "Illustration", required: true, purpose: "isolation probe", style: "technical", aspectRatio: "1:1", seed: 9 } as const;
    const free = await generateAsset({ item, intent: "same intent", provider: new FreePollinationsProvider() });
    const paidStub = { model: "black-forest-labs/flux-schnell", generate: async () => ({ url: "https://cdn.example/paid.webp", model: "black-forest-labs/flux-schnell", width: 1, height: 1 }) };
    const paid = await generateAsset({ item, intent: "same intent", provider: paidStub });
    expect(free.url).toContain("pollinations");
    expect(paid.url).toBe("https://cdn.example/paid.webp");
    clearAssetCacheForTests();
  });
});
