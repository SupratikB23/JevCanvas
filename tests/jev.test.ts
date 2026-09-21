import { describe, expect, it } from "vitest";
import {
  answersToDecisions, buildCompositionQuestions, buildJevState, evaluateComposition,
} from "../lib/jev";

// Real AI Gateway evaluation shapes (per /docs/ai-gateway/modalities/evaluation):
// boolean -> { probability }, choice -> { choice, probabilities },
// score -> interpolated rung index in [0, criteria.length - 1].
const bool = (probability: number): unknown => ({ type: "boolean", probability });
const choice = (c: string): unknown => ({ type: "choice", choice: c, probabilities: { [c]: 1 } });
const score = (s: number): unknown => ({ type: "score", score: s, probabilities: {} });

const VALID = {
  pageType: choice("landing"),
  needsHero: bool(0.9),
  needsMetrics: bool(0.1),
  needsChart: bool(0.2),
  needsTable: bool(0.15),
  needsTimeline: bool(0.1),
  needsSidebar: bool(0.2),
  visualStyle: choice("minimal"),
  visualIntensity: score(0.6), // 3 rungs -> 0.6 / 2 = 0.3 normalized
  needsHeroBackground: bool(0.8),
  needsIllustration: bool(0.3),
  needsSectionDecoration: bool(0.1),
};

describe("jev client", () => {
  it("builds one batched boolean/choice/score question set", () => {
    const q = buildCompositionQuestions();
    expect(q.pageType.type).toBe("choice");
    expect(q.needsHero.type).toBe("boolean");
    expect(q.visualIntensity.type).toBe("score");
    expect(buildJevState("x".repeat(5000)).prompt.length).toBeLessThanOrEqual(2000);
  });

  it("parses typed answers; retries once then falls back", async () => {
    const ok = (async () => new Response(JSON.stringify({ answers: VALID }), { status: 200 })) as unknown as typeof fetch;
    const r = await evaluateComposition({ prompt: "landing page", apiKey: "k", fetchImpl: ok });
    expect(r.decisions.pageType).toBe("landing");
    expect(r.fromFallback).toBe(false);
    let calls = 0;
    const flaky = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ answers: VALID }), { status: calls === 1 ? 500 : 200 });
    }) as unknown as typeof fetch;
    const r2 = await evaluateComposition({ prompt: "landing page", apiKey: "k", fetchImpl: flaky });
    expect(r2.fromFallback).toBe(false);
    expect(calls).toBe(2);
    const down = (async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    const r3 = await evaluateComposition({ prompt: "x", apiKey: "k", fetchImpl: down });
    expect(r3.fromFallback).toBe(true);
  });

  it("maps boolean probabilities and normalizes rung scores", async () => {
    const mk = (answers: Record<string, unknown>): typeof fetch =>
      (async () => new Response(JSON.stringify({ answers }), { status: 200 })) as unknown as typeof fetch;
    const hi = await evaluateComposition({ prompt: "x", apiKey: "k", fetchImpl: mk({ ...VALID, needsHero: bool(0.95) }) });
    expect(hi.decisions.needsHero).toBe(true);
    const lo = await evaluateComposition({ prompt: "x", apiKey: "k", fetchImpl: mk({ ...VALID, needsHero: bool(0.05) }) });
    expect(lo.decisions.needsHero).toBe(false);
    // 3-rung scale: score 1.5 -> 0.75 normalized.
    const mid = await evaluateComposition({ prompt: "x", apiKey: "k", fetchImpl: mk({ ...VALID, visualIntensity: score(1.5) }) });
    expect(mid.decisions.visualIntensity).toBeCloseTo(0.75, 5);
    // Legacy 0..1-tolerant shapes still parse.
    const legacy = await evaluateComposition({
      prompt: "x", apiKey: "k",
      fetchImpl: mk({ ...VALID, needsHero: { value: true }, visualIntensity: { score: 0.4 } }),
    });
    expect(legacy.decisions.needsHero).toBe(true);
  });

  it("rejects out-of-criteria choices via fallback path", () => {
    const d = answersToDecisions({ pageType: { choice: "dashboard" } }, "portfolio site");
    expect(d.pageType).toBe("dashboard");
  });
});
