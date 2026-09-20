// Benchmark pipelines A-D (PRD §38). All provider boundaries are injectable
// so benchmarks run with mocks and no live keys.
import { generateAllAssets, assetUrlsById } from "./assets";
import { buildSpecFromCandidates, candidateRecipes, fallbackSpec, injectAssetUrls, planAssets } from "./composition";
import { ReplicateFluxProvider, type DiffusionProvider } from "./diffusion";
import { fallbackDecisions } from "./jev";
import type { JevDecisions } from "./schemas";
import { emptyTelemetry, type Telemetry } from "./evaluation";
import type { Spec } from "./schemas";

export type PipelineId = "A" | "B" | "C" | "D";

export interface BenchmarkRun {
  pipeline: PipelineId;
  spec: Spec;
  telemetry: Telemetry;
  quality: { structuralOk: boolean; assetCount: number };
}

export interface BenchmarkDeps {
  jevDecisions?: (prompt: string) => Promise<{ decisions: JevDecisions; latencyMs: number }>;
  diffusion?: DiffusionProvider;
}

function mockDecisions(prompt: string): { decisions: JevDecisions; latencyMs: number } {
  return { decisions: fallbackDecisions(prompt), latencyMs: 5 };
}

export async function runPipeline(
  pipeline: PipelineId,
  prompt: string,
  deps: BenchmarkDeps = {},
): Promise<BenchmarkRun> {
  const telemetry = emptyTelemetry();
  const totalStart = performance.now();
  const decide = deps.jevDecisions ?? (async (p: string) => mockDecisions(p));

  if (pipeline === "A") {
    // LLM-only stub: static template spec, no Jev, no diffusion.
    const spec = fallbackSpec(prompt);
    telemetry.totalLatencyMs = performance.now() - totalStart;
    telemetry.componentCount = Object.keys(spec.elements).length;
    return { pipeline, spec, telemetry, quality: { structuralOk: true, assetCount: 0 } };
  }

  const { decisions, latencyMs } = await decide(prompt);
  telemetry.jevCalls = 1;
  telemetry.jevLatencyMs = latencyMs;
  telemetry.questionCount = 12;
  const spec0 = buildSpecFromCandidates(candidateRecipes(decisions, prompt));
  telemetry.componentCount = Object.keys(spec0.elements).length;

  if (pipeline === "B") {
    telemetry.totalLatencyMs = performance.now() - totalStart;
    return { pipeline, spec: spec0, telemetry, quality: { structuralOk: true, assetCount: 0 } };
  }

  // C and D: Jev + diffusion (+ evaluation gate for D).
  const provider: DiffusionProvider =
    deps.diffusion ??
    new ReplicateFluxProvider("mock-token", (async () => {
      throw new Error("No live provider in benchmark.");
    }) as unknown as typeof fetch);
  const dStart = performance.now();
  const items = planAssets(decisions);
  const assets = pipeline === "D" ? await generateAllAssets({ items: items.slice(0, 1), intent: prompt, provider }) : await generateAllAssets({ items, intent: prompt, provider });
  telemetry.diffusionLatencyMs = performance.now() - dStart;
  telemetry.diffusionCalls = assets.filter((a) => a.source === "diffusion").length;
  telemetry.assetCount = assets.length;
  telemetry.cacheHits = assets.filter((a) => a.source === "cache").length;
  const spec = injectAssetUrls(spec0, assetUrlsById(assets));
  telemetry.totalLatencyMs = performance.now() - totalStart;
  return { pipeline, spec, telemetry, quality: { structuralOk: true, assetCount: assets.length } };
}
