// Central budgets and vocab. No magic constants elsewhere; import from here.
export const JEV_MODEL_ID = "typesafe-ai/jev";
// PRD §26 evaluation endpoint. Note: json-render's experimental_createEvaluator
// currently targets POST https://ai-gateway.vercel.sh/v4/ai/evaluation-model
// (choice-only). This constant keeps the PRD §26 URL in one place so the
// transport can be swapped without touching call sites.
export const JEV_EVALUATE_URL = "https://ai-gateway.vercel.sh/v1/evaluate";
export const JEV_TIMEOUT_MS = 15_000;
export const JEV_MAX_RETRIES = 1;

export const MAX_PROMPT_CHARS = 2000;
export const MAX_JEV_EVALS_PER_GENERATION = 8;
export const MIN_JEV_EVALS_PER_GENERATION = 4;
export const MAX_ASSETS_PER_GENERATION = 3;
export const MAX_REGENS_PER_ASSET = 1;
export const MAX_GENERATIONS_PER_ASSET = 2;
export const MAX_ASSETS_PER_PAGE = 6;
export const MAX_IMAGE_COUNT = 6;
export const MAX_IMAGE_WIDTH = 1536;
export const MAX_IMAGE_HEIGHT = 1024;

export const DIFFUSION_MODEL = "black-forest-labs/flux-schnell";
export const DIFFUSION_TIMEOUT_MS = 60_000;
export const DIFFUSION_MAX_RETRIES = 1;
export const DIFFUSION_DEFAULT_STEPS = 4;

export const JEV_EST_COST_PER_1M_INPUT = 0.04;
export const DIFFUSION_EST_COST_PER_IMAGE = 0.003;

export const VISUAL_STYLES = [
  "minimal",
  "editorial",
  "technical",
  "futuristic",
  "soft",
  "corporate",
  "brutalist",
  "playful",
  "monochrome",
  "high-contrast",
] as const;

export const PAGE_TYPES = [
  "dashboard",
  "landing",
  "profile",
  "article",
  "workspace",
] as const;

// 17-component MVP catalog (PRD §13).
export const CATALOG_COMPONENTS = [
  "PageShell",
  "Section",
  "Hero",
  "Heading",
  "Paragraph",
  "MetricCard",
  "Card",
  "Button",
  "Badge",
  "Tabs",
  "Chart",
  "Table",
  "Timeline",
  "Image",
  "Grid",
  "Stack",
  "Divider",
] as const;

// MVP asset categories first; extended list reserved for later (PRD §14).
export const MVP_ASSET_CATEGORIES = [
  "HeroBackground",
  "Illustration",
  "SectionDecoration",
] as const;

export const EXTENDED_ASSET_CATEGORIES = [
  "ProductMockup",
  "ResearchGraphic",
  "Avatar",
  "Texture",
  "IconLikeGraphic",
] as const;
