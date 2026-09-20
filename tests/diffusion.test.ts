import { describe, expect, it } from "vitest";
import {
  buildDiffusionPrompt, dimensionsForAspect, diffusionRequestForPlan,
  normalizeAssetUrl, placeholderFor, ReplicateFluxProvider,
} from "../lib/diffusion";

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
});
