import { z } from "zod";
import {
  CATALOG_COMPONENTS,
  EXTENDED_ASSET_CATEGORIES,
  MAX_ASSETS_PER_PAGE,
  MAX_PROMPT_CHARS,
  MVP_ASSET_CATEGORIES,
  PAGE_TYPES,
  VISUAL_STYLES,
} from "./constants";

// Flat json-render Spec shape: { root, elements: Record<key, UIElement>, state? }.
// Mirrors @json-render/core Spec (v0.21.0) without importing it at runtime, so
// `next build` never breaks when json-render is absent. See adapter in
// composition.ts which prefers validateSpec() when available.
export const UiElementSchema = z.object({
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  children: z.array(z.string()).optional(),
  slots: z.record(z.string(), z.array(z.string())).optional(),
  visible: z.unknown().optional(),
  on: z.record(z.string(), z.unknown()).optional(),
});

export const SpecSchema = z.object({
  root: z.string().min(1),
  elements: z.record(z.string(), UiElementSchema),
  state: z.record(z.string(), z.unknown()).optional(),
});
export type Spec = z.infer<typeof SpecSchema>;

export const ComponentNameSchema = z.enum(CATALOG_COMPONENTS);

export const PageTypeSchema = z.enum(PAGE_TYPES);
export const VisualStyleSchema = z.enum(VISUAL_STYLES);

export const JevBooleanAnswerSchema = z.object({
  value: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
});
export const JevChoiceAnswerSchema = z.object({
  choice: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});
export const JevScoreAnswerSchema = z.object({
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
});

// Typed Jev composition decisions (PRD §16, atomic questions).
export const JevDecisionsSchema = z.object({
  pageType: PageTypeSchema,
  needsHero: z.boolean(),
  needsMetrics: z.boolean(),
  needsChart: z.boolean(),
  needsTable: z.boolean(),
  needsTimeline: z.boolean(),
  needsSidebar: z.boolean(),
  visualStyle: VisualStyleSchema,
  visualIntensity: z.number().min(0).max(1),
  needsHeroBackground: z.boolean(),
  needsIllustration: z.boolean(),
  needsSectionDecoration: z.boolean(),
});
export type JevDecisions = z.infer<typeof JevDecisionsSchema>;

export const AssetCategorySchema = z.enum([
  ...MVP_ASSET_CATEGORIES,
  ...EXTENDED_ASSET_CATEGORIES,
]);

export const AssetPlanItemSchema = z.object({
  id: z.string().min(1),
  type: AssetCategorySchema,
  required: z.boolean(),
  purpose: z.string().min(1),
  style: VisualStyleSchema,
  aspectRatio: z.enum(["16:9", "4:3", "1:1"]),
  seed: z.number().int().optional(),
});
export const AssetPlanSchema = z.object({
  assets: z.array(AssetPlanItemSchema).max(MAX_ASSETS_PER_PAGE),
});
export type AssetPlanItem = z.infer<typeof AssetPlanItemSchema>;

export const AssetStateSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(["planned", "generating", "ready", "failed"]),
  url: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  seed: z.number().int().optional(),
  createdAt: z.string().optional(),
  source: z.enum(["diffusion", "cache", "placeholder"]).optional(),
});
export type AssetState = z.infer<typeof AssetStateSchema>;

export const VersionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  spec: SpecSchema,
  assets: z.array(AssetStateSchema),
  decisions: JevDecisionsSchema.optional(),
  modelIds: z.object({ jev: z.string(), diffusion: z.string() }).optional(),
  timings: z.record(z.string(), z.number()).optional(),
  evalResults: z.array(z.record(z.string(), z.unknown())).optional(),
  createdAt: z.string(),
});
export type Version = z.infer<typeof VersionSchema>;

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
});
export const EditRequestSchema = z.object({
  versionId: z.string().min(1),
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
});
export const AssetGenerateRequestSchema = z.object({
  assetId: z.string().min(1),
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  aspectRatio: z.enum(["16:9", "4:3", "1:1"]).default("16:9"),
  seed: z.number().int().optional(),
});
export const EvaluateRequestSchema = z.object({
  assetId: z.string().min(1).optional(),
  versionId: z.string().min(1).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
});
