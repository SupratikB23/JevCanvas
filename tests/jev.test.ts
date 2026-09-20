import { describe, expect, it } from "vitest";
import {
  answersToDecisions, buildCompositionQuestions, buildJevState, evaluateComposition,
} from "../lib/jev";

const VALID = {
  pageType: { choice: "landing" },
  needsHero: { value: true },
  needsMetrics: { value: false },
  needsChart: { value: false },
  needsTable: { value: false },
  needsTimeline: { value: false },
  needsSidebar: { value: false },
  visualStyle: { choice: "minimal" },
  visualIntensity: { score: 0.3 },
  needsHeroBackground: { value: true },
  needsIllustration: { value: false },
  needsSectionDecoration: { value: false },
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

  it("rejects out-of-criteria choices via fallback path", () => {
    const d = answersToDecisions({ pageType: { choice: "dashboard" } }, "portfolio site");
    expect(d.pageType).toBe("dashboard");
  });
});
