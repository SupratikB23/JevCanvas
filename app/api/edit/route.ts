import { NextResponse } from "next/server";
import { assetUrlsById, generateAllAssets } from "@/lib/assets";
import { buildSpecFromCandidates, candidateRecipes, injectAssetUrls, planAssets } from "@/lib/composition";
import { DIFFUSION_MODEL, JEV_MODEL_ID } from "@/lib/constants";
import { placeholderFor, selectDiffusionProvider } from "@/lib/diffusion";
import { estimateCost } from "@/lib/evaluation";
import { hasJevSecrets } from "@/lib/env";
import { newRequestId } from "@/lib/ids";
import { evaluateComposition, fallbackDecisions } from "@/lib/jev";
import { logEvent } from "@/lib/logging";
import { EditRequestSchema } from "@/lib/schemas";
import { getVersion, saveVersion } from "@/lib/versions";

function errorEnvelope(message: string, status = 500): NextResponse {
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
  const parsed = EditRequestSchema.safeParse(body);
  if (!parsed.success) return errorEnvelope("Invalid edit request.", 400);
  const base = getVersion(parsed.data.versionId);
  if (!base) return errorEnvelope("Version not found.", 404);

  try {
    // Targeted edit: re-decide from the edit prompt, reuse unchanged assets.
    // Jev needs only the gateway key; images resolve via selectDiffusionProvider.
    const jev = hasJevSecrets()
      ? await evaluateComposition({ prompt: parsed.data.prompt, apiKey: process.env.AI_GATEWAY_API_KEY ?? "" })
      : { decisions: fallbackDecisions(parsed.data.prompt), latencyMs: 0, fromFallback: true, questionCount: 12 };
    const combinedPrompt = `${base.prompt} + ${parsed.data.prompt}`;
    const spec0 = buildSpecFromCandidates(candidateRecipes(jev.decisions, combinedPrompt));
    const items = planAssets(jev.decisions);

    const readyById = new Map(base.assets.filter((a) => a.status === "ready").map((a) => [a.id, a]));
    const missing = items.filter((it) => {
      const prev = readyById.get(it.id);
      return !prev || prev.type !== it.type;
    });
    const provider = selectDiffusionProvider();
    const fresh = await generateAllAssets({ items: missing, intent: combinedPrompt, provider });
    const freshById = new Map(fresh.map((a) => [a.id, a]));
    const assets = items.map((it) => freshById.get(it.id) ?? readyById.get(it.id) ?? {
      id: it.id, type: it.type, status: "failed" as const, url: placeholderFor(it.type),
      model: DIFFUSION_MODEL, createdAt: new Date().toISOString(), source: "placeholder" as const,
    });

    const spec = injectAssetUrls(spec0, assetUrlsById(assets));
    const totalLatencyMs = performance.now() - totalStart;
    const version = saveVersion({
      prompt: combinedPrompt,
      spec,
      assets,
      decisions: jev.decisions,
      modelIds: { jev: JEV_MODEL_ID, diffusion: DIFFUSION_MODEL },
      timings: { jevLatencyMs: jev.latencyMs, totalLatencyMs },
    });
    logEvent({ requestId, stage: "edit", status: "ok", componentCount: Object.keys(spec.elements).length, questionCount: jev.questionCount });
    return NextResponse.json({
      versionId: version.id,
      spec,
      assets,
      changedAssets: missing.map((m) => m.id),
      decisions: jev.decisions,
      timing: {
        jevLatencyMs: jev.latencyMs, diffusionLatencyMs: 0, renderLatencyMs: 0, totalLatencyMs,
        jevCalls: 1, diffusionCalls: fresh.filter((a) => a.source === "diffusion").length,
        cacheHits: fresh.filter((a) => a.source === "cache").length,
        estCostUsd: estimateCost(2000, fresh.filter((a) => a.model === DIFFUSION_MODEL).length),
        componentCount: Object.keys(spec.elements).length,
        questionCount: jev.questionCount, assetCount: assets.length,
        fromFallback: jev.fromFallback,
      },
    });
  } catch {
    logEvent({ requestId, stage: "edit", status: "error" });
    return errorEnvelope("Edit failed. The previous version is unchanged.");
  }
}
