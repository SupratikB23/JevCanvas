// decisions -> validated flat Spec + asset plan. Catalog-constrained only.
// Unknown components and invalid actions are rejected before render.
import {
  CATALOG_COMPONENTS,
  MAX_ASSETS_PER_GENERATION,
  MAX_ASSETS_PER_PAGE,
} from "./constants";
import type { AssetPlanItem, JevDecisions, Spec } from "./schemas";
import { AssetPlanSchema, SpecSchema } from "./schemas";

export interface Candidate {
  id: string;
  description: string;
  element: { type: string; props: Record<string, unknown> };
}

const KNOWN = new Set<string>(CATALOG_COMPONENTS);
const ALLOWED_ACTIONS = new Set(["navigate", "setState", "submit", "selectTab", "noop"]);

export function isKnownComponent(type: string): boolean {
  return KNOWN.has(type);
}

export function isAllowedAction(name: string): boolean {
  return ALLOWED_ACTIONS.has(name);
}

// Candidate recipes (PRD §17). Jev selects; it never invents components.
export function candidateRecipes(decisions: JevDecisions, prompt: string): Candidate[] {
  const title = prompt.slice(0, 120) || "Generated interface";
  const out: Candidate[] = [
    { id: "shell-01", description: "Root page shell with sidebar slot", element: { type: "PageShell", props: { title, sidebar: decisions.needsSidebar } } },
  ];
  if (decisions.needsHero)
    out.push({ id: "hero-01", description: "Large hero section with headline and generated visual background", element: { type: "Hero", props: { title, subtitle: `${decisions.visualStyle} style`, backgroundAssetId: "hero-bg" } } });
  if (decisions.needsMetrics)
    out.push({ id: "metrics-01", description: "Four compact metric cards for dashboard statistics", element: { type: "MetricCard", props: { items: [{ label: "Latency", value: "—" }, { label: "Assets", value: "—" }, { label: "Components", value: "—" }, { label: "Cost", value: "—" }] } } });
  if (decisions.needsChart)
    out.push({ id: "chart-01", description: "Chart panel for telemetry or metrics series", element: { type: "Chart", props: { title: "Overview", series: [] } } });
  if (decisions.needsTable)
    out.push({ id: "table-01", description: "Data table for papers, projects, or rows", element: { type: "Table", props: { columns: ["Name", "Detail", "Status"], rows: [] } } });
  if (decisions.needsTimeline)
    out.push({ id: "timeline-01", description: "Vertical timeline for milestones or route events", element: { type: "Timeline", props: { items: [] } } });
  out.push({ id: "cta-01", description: "Card with a primary action button", element: { type: "Card", props: { title: "Next steps" } } });
  return out.filter((c) => isKnownComponent(c.element.type));
}

let elementCounter = 0;

function nextKey(prefix: string): string {
  elementCounter += 1;
  return `${prefix}-${elementCounter.toString(36)}`;
}

export function resetElementCounterForTests(): void {
  elementCounter = 0;
}

// Deterministic fallback template when Jev is unavailable.
export function fallbackSpec(prompt: string): Spec {
  const title = prompt.slice(0, 120) || "Generated interface";
  return SpecSchema.parse({
    root: "root",
    elements: {
      root: { type: "PageShell", props: { title, sidebar: false }, children: ["hero", "body"] },
      hero: { type: "Hero", props: { title, subtitle: "technical style", backgroundAssetId: "hero-bg" } },
      body: { type: "Section", props: { title: "Overview" }, children: ["cards"] },
      cards: { type: "Card", props: { title: "Getting started" } },
    },
  });
}

export function buildSpecFromCandidates(candidates: Candidate[]): Spec {
  const elements: Spec["elements"] = {};
  const childKeys: string[] = [];
  for (const c of candidates) {
    if (!isKnownComponent(c.element.type)) throw new Error(`Unknown component: ${c.element.type}.`);
    const key = `${c.id}`;
    elements[key] = { type: c.element.type, props: { ...c.element.props } };
    if (c.id !== "shell-01") childKeys.push(key);
  }
  const rootKey = elements["shell-01"] ? "shell-01" : nextKey("el");
  if (!elements[rootKey])
    elements[rootKey] = { type: "PageShell", props: { title: "Generated interface" }, children: childKeys };
  else elements[rootKey] = { ...elements[rootKey], children: childKeys };
  const spec = { root: rootKey, elements };
  const parsed = SpecSchema.safeParse(spec);
  if (!parsed.success) return fallbackSpec("Generated interface");
  return parsed.data;
}

// Prefer json-render validateSpec() when installed; else local zod check.
// Dynamic import keeps `next build` green when @json-render/core is absent.
// Real signature (v0.21.0): validateSpec(spec) -> { valid, issues }.
export async function validateWithJsonRender(spec: Spec): Promise<boolean> {
  try {
    const mod = (await import("@json-render/core")) as unknown as {
      validateSpec?: (s: unknown) => unknown;
    };
    if (typeof mod.validateSpec === "function") {
      const r = mod.validateSpec(spec) as
        | { valid?: unknown; success?: unknown }
        | boolean
        | null
        | undefined;
      if (typeof r === "boolean") return r;
      if (r && typeof r === "object") {
        if (typeof r.valid === "boolean") return r.valid;
        if (typeof r.success === "boolean") return r.success;
      }
      return false;
    }
  } catch {
    // Fall through to local validation.
  }
  return SpecSchema.safeParse(spec).success;
}

export function rejectUnknownComponents(spec: Spec): string[] {
  return Object.entries(spec.elements)
    .filter(([, el]) => !isKnownComponent(el.type))
    .map(([key]) => key);
}

export function rejectInvalidActions(spec: Spec): string[] {
  const bad: string[] = [];
  for (const [key, el] of Object.entries(spec.elements)) {
    const on = el.on as Record<string, unknown> | undefined;
    if (!on) continue;
    for (const binding of Object.values(on)) {
      const names = Array.isArray(binding)
        ? binding.map((b) => (b as { action?: string }).action)
        : [(binding as { action?: string }).action];
      for (const n of names) {
        if (typeof n === "string" && !isAllowedAction(n)) bad.push(`${key}:${n}`);
      }
    }
  }
  return bad;
}

// decisions -> asset plan, capped by budgets (max 3/gen, 6/page).
export function planAssets(decisions: JevDecisions, seedBase = 7): AssetPlanItem[] {
  const items: AssetPlanItem[] = [];
  if (decisions.needsHeroBackground)
    items.push({ id: "hero-bg", type: "HeroBackground", required: true, purpose: "Hero section background", style: decisions.visualStyle, aspectRatio: "16:9", seed: seedBase });
  if (decisions.needsIllustration)
    items.push({ id: "illustration-1", type: "Illustration", required: true, purpose: "Visual accompanying main section", style: decisions.visualStyle, aspectRatio: "4:3", seed: seedBase + 1 });
  if (decisions.needsSectionDecoration)
    items.push({ id: "decoration-1", type: "SectionDecoration", required: false, purpose: "Decorative section accent", style: decisions.visualStyle, aspectRatio: "1:1", seed: seedBase + 2 });
  const capped = items.slice(0, Math.min(MAX_ASSETS_PER_GENERATION, MAX_ASSETS_PER_PAGE));
  return AssetPlanSchema.parse({ assets: capped }).assets;
}

export function injectAssetUrls(spec: Spec, urls: Record<string, string>): Spec {
  const elements: Spec["elements"] = {};
  for (const [key, el] of Object.entries(spec.elements)) {
    const props = { ...el.props };
    const assetId = props.backgroundAssetId ?? props.assetId ?? props.src;
    if (typeof assetId === "string" && urls[assetId]) {
      if ("backgroundAssetId" in props) props.backgroundAssetId = urls[assetId];
      else if ("assetId" in props) props.assetId = urls[assetId];
      else props.src = urls[assetId];
      props.assetUrl = urls[assetId];
    }
    elements[key] = { ...el, props };
  }
  return SpecSchema.parse({ root: spec.root, elements, state: spec.state });
}
