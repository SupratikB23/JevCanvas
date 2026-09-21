// Asset cache + orchestration. Keyed by normalized prompt+model+params+seed.
import { DIFFUSION_MODEL } from "./constants";
import { diffusionRequestForPlan, normalizeAssetUrl, placeholderFor, type DiffusionProvider, type DiffusionRequest } from "./diffusion";
import { newAssetId, newRequestId } from "./ids";
import { logEvent } from "./logging";
import type { AssetPlanItem, AssetState } from "./schemas";

export function cacheKey(prompt: string, model: string, params: { aspectRatio: string; seed?: number; steps?: number }): string {
  return [prompt.trim().toLowerCase(), model, params.aspectRatio, String(params.seed ?? "noseed"), String(params.steps ?? "nosteps")].join("|");
}

const cache = new Map<string, { url: string; asset: AssetState }>();
let cacheHits = 0;

export function cacheStats(): { size: number; hits: number } {
  return { size: cache.size, hits: cacheHits };
}

export function clearAssetCacheForTests(): void {
  cache.clear();
  cacheHits = 0;
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function generateAsset(args: {
  item: AssetPlanItem;
  intent: string;
  provider: DiffusionProvider;
}): Promise<AssetState> {
  const requestId = newRequestId();
  const req: DiffusionRequest = diffusionRequestForPlan(args.item, args.intent);
  // Key per provider model so free and paid results for the same prompt never
  // collide (e.g. token added mid-session). Absent tag means the paid default.
  const key = cacheKey(req.prompt, args.provider.model ?? DIFFUSION_MODEL, { aspectRatio: req.aspectRatio, seed: req.seed });
  const hit = cache.get(key);
  if (hit) {
    cacheHits += 1;
    logEvent({ requestId, stage: "asset-cache", status: "ok", assetId: args.item.id, cacheHit: true });
    return { ...hit.asset, id: args.item.id };
  }
  try {
    const result = await args.provider.generate(req);
    const url = normalizeAssetUrl(result.url);
    const asset: AssetState = {
      id: args.item.id,
      type: args.item.type,
      status: "ready",
      url,
      prompt: req.prompt,
      model: result.model,
      seed: result.seed,
      createdAt: new Date().toISOString(),
      source: "diffusion",
    };
    cache.set(key, { url, asset });
    return asset;
  } catch {
    // Graceful fallback: placeholder keeps an otherwise valid UI usable.
    logEvent({ requestId, stage: "asset-cache", status: "fallback", assetId: args.item.id });
    return {
      id: args.item.id,
      type: args.item.type,
      status: "failed",
      url: placeholderFor(args.item.type),
      prompt: req.prompt,
      model: DIFFUSION_MODEL,
      seed: req.seed,
      createdAt: new Date().toISOString(),
      source: "placeholder",
    };
  }
}

export async function generateAllAssets(args: {
  items: AssetPlanItem[];
  intent: string;
  provider: DiffusionProvider;
}): Promise<AssetState[]> {
  const out: AssetState[] = [];
  for (const item of args.items) out.push(await generateAsset({ item, intent: args.intent, provider: args.provider }));
  return out;
}

export function assetUrlsById(assets: AssetState[]): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const a of assets) {
    if (a.url && (isHttpUrl(a.url) || a.url.startsWith("data:image/svg+xml"))) urls[a.id] = a.url;
  }
  return urls;
}

export function missingAssetFallback(type: string): AssetState {
  return {
    id: newAssetId(type),
    type,
    status: "failed",
    url: placeholderFor(type),
    model: DIFFUSION_MODEL,
    createdAt: new Date().toISOString(),
    source: "placeholder",
  };
}
