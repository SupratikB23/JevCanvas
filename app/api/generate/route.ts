import { NextResponse } from "next/server";
import { assetUrlsById, generateAllAssets } from "@/lib/assets";
import { buildSpecFromCandidates, candidateRecipes, injectAssetUrls, planAssets } from "@/lib/composition";
import { DIFFUSION_MODEL, JEV_MODEL_ID } from "@/lib/constants";
import { selectDiffusionProvider } from "@/lib/diffusion";
import { estimateCost } from "@/lib/evaluation";
import { hasJevSecrets } from "@/lib/env";
import { newRequestId } from "@/lib/ids";
import { evaluateComposition, fallbackDecisions } from "@/lib/jev";
import { logEvent } from "@/lib/logging";
import { GenerateRequestSchema } from "@/lib/schemas";
import { saveVersion } from "@/lib/versions";

function errorEnvelope(message: string, status = 500): NextResponse {
  // Never leak provider details, keys, or raw upstream errors to the client.
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = newRequestId();
  const totalStart = performance.now();
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return errorEnvelope("Invalid JSON body.", 400);
  }
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return errorEnvelope("Invalid prompt: 1-2000 characters required.", 400);
  const prompt = parsed.data.prompt;

  try {
    // Jev decisions need only the gateway key; images use paid Replicate when
    // configured, otherwise the free keyless provider (placeholder fallback
    // inside generateAllAssets keeps the UI usable on provider failure).
    const jevStart = performance.now();
    const jev = hasJevSecrets()
      ? await evaluateComposition({ prompt, apiKey: process.env.AI_GATEWAY_API_KEY ?? "" })
      : { decisions: fallbackDecisions(prompt), latencyMs: 0, fromFallback: true, questionCount: 12 };
    const jevLatencyMs = performance.now() - jevStart;

    const spec0 = buildSpecFromCandidates(candidateRecipes(jev.decisions, prompt));
    const items = planAssets(jev.decisions);

    // Diffusion assets (placeholder fallback keeps UI usable on failure).
    const diffusionStart = performance.now();
    const provider = selectDiffusionProvider();
    const assets = await generateAllAssets({ items, intent: prompt, provider });
    const diffusionLatencyMs = performance.now() - diffusionStart;

    const spec = injectAssetUrls(spec0, assetUrlsById(assets));
    const totalLatencyMs = performance.now() - totalStart;
    const version = saveVersion({
      prompt,
      spec,
      assets,
      decisions: jev.decisions,
      modelIds: { jev: JEV_MODEL_ID, diffusion: DIFFUSION_MODEL },
      timings: { jevLatencyMs, diffusionLatencyMs, totalLatencyMs },
    });
    logEvent({
      requestId, stage: "generate", status: "ok",
      componentCount: Object.keys(spec.elements).length,
      questionCount: jev.questionCount,
    });
    return NextResponse.json({
      versionId: version.id,
      spec,
      assets,
      decisions: jev.decisions,
      timing: {
        jevLatencyMs, diffusionLatencyMs, renderLatencyMs: 0, totalLatencyMs,
        jevCalls: 1,
        diffusionCalls: assets.filter((a) => a.source === "diffusion").length,
        cacheHits: assets.filter((a) => a.source === "cache").length,
        // Cost only the paid model; free-provider and placeholder assets are $0.
        estCostUsd: estimateCost(2000, assets.filter((a) => a.model === DIFFUSION_MODEL).length),
        componentCount: Object.keys(spec.elements).length,
        questionCount: jev.questionCount,
        assetCount: assets.length,
        fromFallback: jev.fromFallback,
      },
    });
  } catch {
    logEvent({ requestId, stage: "generate", status: "error" });
    return errorEnvelope("Generation failed. Please try again.");
  }
}
