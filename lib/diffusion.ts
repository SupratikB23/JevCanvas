// Diffusion provider boundary. Visuals only; never structure or actions.
import {
  DIFFUSION_DEFAULT_STEPS,
  DIFFUSION_MAX_RETRIES,
  DIFFUSION_MODEL,
  DIFFUSION_TIMEOUT_MS,
  FREE_DIFFUSION_BASE_URL,
  FREE_DIFFUSION_MODEL,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
} from "./constants";
import { hasDiffusionSecrets, replicateApiToken } from "./env";
import { newRequestId } from "./ids";
import { logEvent } from "./logging";
import type { AssetPlanItem } from "./schemas";

export interface DiffusionRequest {
  prompt: string;
  aspectRatio: "16:9" | "4:3" | "1:1";
  seed?: number;
  steps?: number;
}

export interface DiffusionResult {
  url: string;
  model: string;
  seed?: number;
  width: number;
  height: number;
}

export interface DiffusionProvider {
  // Optional model tag so the asset cache can key per provider. Absent means
  // the default paid model (keeps existing stub providers working as before).
  readonly model?: string;
  generate(req: DiffusionRequest): Promise<DiffusionResult>;
}

export type FetchLike = typeof fetch;

export function dimensionsForAspect(ratio: DiffusionRequest["aspectRatio"]): { width: number; height: number } {
  if (ratio === "4:3") return { width: 1024, height: Math.min(768, MAX_IMAGE_HEIGHT) };
  if (ratio === "1:1") return { width: 1024, height: 1024 };
  return { width: Math.min(1344, MAX_IMAGE_WIDTH), height: 768 };
}

// Structured prompt: intent + purpose + style + composition + constraints.
export function buildDiffusionPrompt(args: {
  intent: string;
  purpose: string;
  style: string;
  aspectRatio: DiffusionRequest["aspectRatio"];
}): string {
  const { intent, purpose, style, aspectRatio } = args;
  return [
    `Create a ${style} ${purpose} for ${intent}.`,
    "Minimal central visual density.",
    "Leave substantial negative space for interface text.",
    "Abstract, atmospheric, high quality.",
    "No readable text.",
    "No logos.",
    `Wide ${aspectRatio} composition.`,
  ].join(" ");
}

export function normalizeAssetUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//.test(trimmed)) throw new Error("Asset URL must be http(s).");
  if (trimmed.length > 2048) throw new Error("Asset URL too long.");
  return trimmed;
}

const PLACEHOLDERS: Record<string, string> = {
  HeroBackground: svgPlaceholder("Hero background", 1344, 768),
  Illustration: svgPlaceholder("Illustration", 1024, 768),
  SectionDecoration: svgPlaceholder("Decoration", 1024, 1024),
};

export function svgPlaceholder(label: string, w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#1a1d24"/><text x="50%" y="50%" fill="#8b93a5" font-family="sans-serif" font-size="32" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function placeholderFor(type: string): string {
  return PLACEHOLDERS[type] ?? svgPlaceholder("Asset", 1024, 768);
}

export class ReplicateFluxProvider implements DiffusionProvider {
  readonly model = DIFFUSION_MODEL;
  constructor(
    private apiToken: string,
    private fetchImpl: FetchLike = fetch,
  ) {}

  async generate(req: DiffusionRequest): Promise<DiffusionResult> {
    const requestId = newRequestId();
    const { width, height } = dimensionsForAspect(req.aspectRatio);
    const body = {
      model: DIFFUSION_MODEL,
      input: {
        prompt: req.prompt,
        aspect_ratio: req.aspectRatio,
        num_outputs: 1,
        output_format: "webp",
        num_inference_steps: req.steps ?? DIFFUSION_DEFAULT_STEPS,
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
      },
    };
    const start = performance.now();
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= DIFFUSION_MAX_RETRIES; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DIFFUSION_TIMEOUT_MS);
        try {
          const res = await this.fetchImpl("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              "Content-Type": "application/json",
              Prefer: "wait",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`Diffusion HTTP ${res.status}.`);
          const data = (await res.json()) as { output?: unknown };
          const url = Array.isArray(data.output) ? data.output[0] : data.output;
          if (typeof url !== "string") throw new Error("Diffusion returned no URL.");
          const latencyMs = performance.now() - start;
          logEvent({ requestId, stage: "diffusion", model: DIFFUSION_MODEL, latencyMs, status: "ok" });
          return { url: normalizeAssetUrl(url), model: DIFFUSION_MODEL, seed: req.seed, width, height };
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = err;
      }
    }
    void lastError;
    logEvent({ requestId, stage: "diffusion", model: DIFFUSION_MODEL, latencyMs: performance.now() - start, status: "error" });
    throw new Error("Diffusion generation failed.");
  }
}

export function diffusionRequestForPlan(
  item: AssetPlanItem,
  intent: string,
): DiffusionRequest {
  return {
    prompt: buildDiffusionPrompt({ intent, purpose: item.purpose, style: item.style, aspectRatio: item.aspectRatio }),
    aspectRatio: item.aspectRatio,
    seed: item.seed,
  };
}

// Free tier: keyless Pollinations provider. The image URL itself encodes the
// request, so generation is pure URL-building with no server-side fetch and
// no account. Lower fidelity and no seed guarantees vs flux-schnell, but $0.
// The head of the prompt carries the subject; the tail constraint is
// re-appended so it survives the length cap for very long user intents.
export class FreePollinationsProvider implements DiffusionProvider {
  readonly model = FREE_DIFFUSION_MODEL;

  async generate(req: DiffusionRequest): Promise<DiffusionResult> {
    const requestId = newRequestId();
    const { width, height } = dimensionsForAspect(req.aspectRatio);
    const head = req.prompt.slice(0, 600);
    const prompt = encodeURIComponent(`${head} No readable text, no logos, no watermark.`);
    // negative_prompt suppresses the garbled pseudo-text free models love to
    // render; nologo drops the watermark. Both are best-effort hints.
    const negative = encodeURIComponent("worst quality, blurry, text, words, letters, watermark, logo");
    const url = `${FREE_DIFFUSION_BASE_URL}/${prompt}?width=${width}&height=${height}&seed=${req.seed ?? 42}&nologo=true&model=flux&negative_prompt=${negative}`;
    logEvent({ requestId, stage: "diffusion", model: FREE_DIFFUSION_MODEL, latencyMs: 0, status: "ok" });
    return { url: normalizeAssetUrl(url), model: FREE_DIFFUSION_MODEL, seed: req.seed, width, height };
  }
}

// Single selection point for all routes: paid Replicate when the token is
// configured, otherwise the free keyless provider. Never placeholders here;
// generateAsset() in lib/assets.ts already falls back to placeholders when a
// provider throws.
export function selectDiffusionProvider(): DiffusionProvider {
  if (hasDiffusionSecrets()) return new ReplicateFluxProvider(replicateApiToken());
  return new FreePollinationsProvider();
}
