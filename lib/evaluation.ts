// Closed-loop evaluation: vision-feature stub -> Jev accept/regenerate/fallback.
// The vision adapter is deliberately separate from Jev (PRD §20).
import {
  DIFFUSION_EST_COST_PER_IMAGE,
  JEV_EST_COST_PER_1M_INPUT,
  MAX_GENERATIONS_PER_ASSET,
} from "./constants";
import type { AssetState } from "./schemas";

export interface VisionFeatures {
  hasText: boolean;
  dark: boolean;
  negativeSpace: boolean;
  matchesStyle: boolean;
  width?: number;
  height?: number;
}

// Deterministic stub: derives features from metadata only. A real deployment
// swaps this for a vision-language model; the Jev boundary is unchanged.
export function extractVisionFeaturesStub(asset: AssetState, expectedStyle: string): VisionFeatures {
  const prompt = (asset.prompt ?? "").toLowerCase();
  return {
    hasText: /text|word|letter/.test(prompt),
    dark: /dark|night|black|navy/.test(prompt),
    negativeSpace: /negative space/.test(prompt),
    matchesStyle: prompt.includes(expectedStyle.toLowerCase()),
    width: undefined,
    height: undefined,
  };
}

export type EvalDecision = "accept" | "regenerate" | "fallback";

export interface AssetEvalResult {
  assetId: string;
  decision: EvalDecision;
  reasonCode: string;
  probability: number;
  evaluatedAt: string;
  generationsUsed: number;
}

export function decideAssetFit(args: {
  assetId: string;
  features: VisionFeatures;
  generationsUsed: number;
}): AssetEvalResult {
  const { assetId, features, generationsUsed } = args;
  const evaluatedAt = new Date().toISOString();
  if (generationsUsed >= MAX_GENERATIONS_PER_ASSET)
    return { assetId, decision: "fallback", reasonCode: "budget-exhausted", probability: 0.5, evaluatedAt, generationsUsed };
  if (features.hasText)
    return { assetId, decision: "regenerate", reasonCode: "contains-text", probability: 0.35, evaluatedAt, generationsUsed };
  if (features.matchesStyle && features.negativeSpace)
    return { assetId, decision: "accept", reasonCode: "style-and-space-ok", probability: 0.9, evaluatedAt, generationsUsed };
  if (features.matchesStyle)
    return { assetId, decision: "accept", reasonCode: "style-ok", probability: 0.75, evaluatedAt, generationsUsed };
  return { assetId, decision: "regenerate", reasonCode: "style-mismatch", probability: 0.4, evaluatedAt, generationsUsed };
}

export interface Telemetry {
  jevLatencyMs: number;
  diffusionLatencyMs: number;
  renderLatencyMs: number;
  totalLatencyMs: number;
  jevCalls: number;
  diffusionCalls: number;
  cacheHits: number;
  estCostUsd: number;
  componentCount: number;
  questionCount: number;
  assetCount: number;
}

export function estimateCost(jevInputTokens: number, diffusionImages: number): number {
  return (jevInputTokens / 1_000_000) * JEV_EST_COST_PER_1M_INPUT + diffusionImages * DIFFUSION_EST_COST_PER_IMAGE;
}

export function emptyTelemetry(): Telemetry {
  return {
    jevLatencyMs: 0, diffusionLatencyMs: 0, renderLatencyMs: 0, totalLatencyMs: 0,
    jevCalls: 0, diffusionCalls: 0, cacheHits: 0, estCostUsd: 0,
    componentCount: 0, questionCount: 0, assetCount: 0,
  };
}
