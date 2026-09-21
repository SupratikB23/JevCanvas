// Jev client via Vercel AI Gateway Evaluation API (server-side only).
// Jev makes typed decisions only: never prose, JSX, or code.
import {
  JEV_EVALUATE_URL,
  JEV_MAX_RETRIES,
  JEV_MODEL_ID,
  JEV_TIMEOUT_MS,
  MAX_PROMPT_CHARS,
} from "./constants";
import { newRequestId } from "./ids";
import { logEvent } from "./logging";
import { JevDecisionsSchema, type JevDecisions } from "./schemas";

export type JevQuestionType = "boolean" | "choice" | "score";

export interface JevQuestion {
  type: JevQuestionType;
  instructions: string;
  criteria?: Record<string, string> | string[];
}

export interface JevAnswer {
  booleanValue?: boolean;
  choice?: string;
  score?: number;
  confidence?: number;
}

export type FetchLike = typeof fetch;

// Atomic composition questions (PRD §16). One request, many questions.
export function buildCompositionQuestions(): Record<string, JevQuestion> {
  return {
    pageType: {
      type: "choice",
      instructions: "What page archetype best matches the request?",
      criteria: {
        dashboard: "Metric-heavy application or operational dashboard",
        landing: "Promotional or marketing page",
        profile: "Profile, portfolio, or identity page",
        article: "Long-form reading page",
        workspace: "Interactive application workspace",
      },
    },
    needsHero: {
      type: "boolean",
      instructions: "Does the requested interface need a prominent hero section?",
    },
    needsMetrics: {
      type: "boolean",
      instructions: "Does the request call for metric cards or KPIs?",
    },
    needsChart: {
      type: "boolean",
      instructions: "Does the request call for a chart or data visualization?",
    },
    needsTable: {
      type: "boolean",
      instructions: "Does the request call for a data table?",
    },
    needsTimeline: {
      type: "boolean",
      instructions: "Does the request call for a timeline or sequence?",
    },
    needsSidebar: {
      type: "boolean",
      instructions: "Does the request call for a sidebar or secondary nav?",
    },
    visualStyle: {
      type: "choice",
      instructions: "Which visual style best matches the request?",
      criteria: {
        minimal: "Clean, sparse, restrained",
        editorial: "Publication-oriented, typography-led",
        technical: "Technical, data-oriented, precise",
        futuristic: "Advanced, digital, speculative",
        soft: "Gentle, rounded, calm",
        corporate: "Professional business-oriented",
        brutalist: "Raw, high-contrast, blocky",
        playful: "Colorful, informal, energetic",
        monochrome: "Single-hue, restrained palette",
        "high-contrast": "Bold extremes of light and dark",
      },
    },
    visualIntensity: {
      type: "score",
      instructions: "How visually expressive should the interface be?",
      criteria: [
        "mostly functional and restrained",
        "moderately visual",
        "highly visual and expressive",
      ],
    },
    needsHeroBackground: {
      type: "boolean",
      instructions: "Is a generated hero background image justified?",
    },
    needsIllustration: {
      type: "boolean",
      instructions: "Is a generated illustration justified for this request?",
    },
    needsSectionDecoration: {
      type: "boolean",
      instructions: "Is a decorative section asset justified, or can the layout stand without it?",
    },
  };
}

export function buildJevState(prompt: string): { prompt: string; availableComponents: string[] } {
  return {
    prompt: prompt.slice(0, MAX_PROMPT_CHARS),
    availableComponents: [
      "PageShell", "Section", "Hero", "Heading", "Paragraph",
      "MetricCard", "Card", "Button", "Badge", "Tabs", "Chart",
      "Table", "Timeline", "Image", "Grid", "Stack", "Divider",
    ],
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function parseAnswer(
  name: string,
  question: JevQuestion,
  raw: unknown,
): JevAnswer {
  const obj = (raw ?? {}) as Record<string, unknown>;
  if (question.type === "boolean") {
    // Real gateway shape: { type: "boolean", probability: 0..1 } where the
    // probability is that of the TRUE case (per AI Gateway evaluation docs).
    const p = obj.probability;
    if (typeof p === "number" && Number.isFinite(p)) {
      const cp = clamp01(p);
      return { booleanValue: cp >= 0.5, confidence: cp >= 0.5 ? cp : 1 - cp };
    }
    // Tolerant legacy shapes.
    if (typeof obj.value === "boolean")
      return { booleanValue: obj.value, confidence: toConfidence(obj.confidence) };
    if (typeof obj.choice === "string")
      return { booleanValue: obj.choice === "true", confidence: toConfidence(obj.confidence) };
    throw new Error(`Invalid boolean answer for ${name}.`);
  }
  if (question.type === "choice") {
    // Real gateway shape: { type: "choice", choice, probabilities }.
    const criteria = question.criteria ?? {};
    const keys = Array.isArray(criteria) ? criteria : Object.keys(criteria);
    if (typeof obj.choice === "string" && keys.includes(obj.choice))
      return { choice: obj.choice, confidence: toConfidence(obj.confidence) };
    throw new Error(`Invalid choice answer for ${name}.`);
  }
  // Real gateway shape: { type: "score", score, probabilities } where score is
  // the interpolated rung index in [0, criteria.length - 1]. Normalize to 0..1.
  // A bare 0..1 score (no array criteria) is accepted as-is for tolerance.
  if (typeof obj.score === "number" && Number.isFinite(obj.score)) {
    const criteria = question.criteria;
    const rungs = Array.isArray(criteria) ? Math.max(criteria.length - 1, 1) : 1;
    return { score: clamp01(obj.score / rungs), confidence: toConfidence(obj.confidence) };
  }
  throw new Error(`Invalid score answer for ${name}.`);
}

function toConfidence(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? clamp01(v) : undefined;
}

// Safe defaults: keep last valid spec path. Deterministic, no model needed.
export function fallbackDecisions(prompt: string): JevDecisions {
  const p = prompt.toLowerCase();
  return JevDecisionsSchema.parse({
    pageType: p.includes("portfolio") || p.includes("profile") ? "profile"
      : p.includes("landing") || p.includes("product page") ? "landing"
      : p.includes("article") || p.includes("blog") ? "article"
      : p.includes("workspace") || p.includes("music") || p.includes("studio") ? "workspace"
      : "dashboard",
    needsHero: true,
    needsMetrics: /metric|dashboard|kpi|telemetry|status|carla/.test(p),
    needsChart: /chart|metric|telemetry|visualiz|graph/.test(p),
    needsTable: /table|paper|list|publication|project/.test(p),
    needsTimeline: /timeline|roadmap|history|route/.test(p),
    needsSidebar: /sidebar|dashboard|workspace/.test(p),
    visualStyle: p.includes("futuristic") ? "futuristic"
      : p.includes("editorial") ? "editorial"
      : p.includes("minimal") ? "minimal"
      : p.includes("brutalist") ? "brutalist"
      : p.includes("playful") || p.includes("music") ? "playful"
      : p.includes("corporate") ? "corporate"
      : "technical",
    visualIntensity: 0.6,
    needsHeroBackground: true,
    needsIllustration: /illustration|portfolio|product|research|music|carla/.test(p),
    needsSectionDecoration: false,
  });
}

export function answersToDecisions(
  answers: Record<string, JevAnswer>,
  prompt: string,
): JevDecisions {
  const fallback = fallbackDecisions(prompt);
  const pick = <K extends keyof JevDecisions>(name: string, cur: JevDecisions[K]): JevDecisions[K] => {
    const a = answers[name];
    if (!a) return cur;
    if (typeof a.booleanValue === "boolean") return a.booleanValue as JevDecisions[K];
    if (typeof a.choice === "string") return a.choice as JevDecisions[K];
    if (typeof a.score === "number") return clamp01(a.score) as JevDecisions[K];
    return cur;
  };
  return JevDecisionsSchema.parse({
    pageType: pick("pageType", fallback.pageType),
    needsHero: pick("needsHero", fallback.needsHero),
    needsMetrics: pick("needsMetrics", fallback.needsMetrics),
    needsChart: pick("needsChart", fallback.needsChart),
    needsTable: pick("needsTable", fallback.needsTable),
    needsTimeline: pick("needsTimeline", fallback.needsTimeline),
    needsSidebar: pick("needsSidebar", fallback.needsSidebar),
    visualStyle: pick("visualStyle", fallback.visualStyle),
    visualIntensity: pick("visualIntensity", fallback.visualIntensity),
    needsHeroBackground: pick("needsHeroBackground", fallback.needsHeroBackground),
    needsIllustration: pick("needsIllustration", fallback.needsIllustration),
    needsSectionDecoration: pick("needsSectionDecoration", fallback.needsSectionDecoration),
  });
}

export interface JevEvaluateResult {
  decisions: JevDecisions;
  latencyMs: number;
  fromFallback: boolean;
  questionCount: number;
}

async function postOnce(args: {
  apiKey: string;
  state: Record<string, unknown>;
  questions: Record<string, JevQuestion>;
  timeoutMs: number;
  fetchImpl: FetchLike;
}): Promise<Record<string, JevAnswer>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const res = await args.fetchImpl(JEV_EVALUATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JEV_MODEL_ID,
        state: args.state,
        questions: args.questions,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Jev HTTP ${res.status}.`);
    const data = (await res.json()) as { answers?: Record<string, unknown> };
    const out: Record<string, JevAnswer> = {};
    for (const [name, q] of Object.entries(args.questions))
      out[name] = parseAnswer(name, q, data.answers?.[name]);
    return out;
  } finally {
    clearTimeout(timer);
  }
}

// Single batched request, one retry max, fallback to safe defaults on failure.
export async function evaluateComposition(args: {
  prompt: string;
  apiKey: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<JevEvaluateResult> {
  const requestId = newRequestId();
  const prompt = args.prompt.slice(0, MAX_PROMPT_CHARS);
  const questions = buildCompositionQuestions();
  const state = buildJevState(prompt);
  const fetchImpl = args.fetchImpl ?? fetch;
  const timeoutMs = args.timeoutMs ?? JEV_TIMEOUT_MS;
  const start = performance.now();
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= JEV_MAX_RETRIES; attempt += 1) {
    try {
      const answers = await postOnce({ apiKey: args.apiKey, state, questions, timeoutMs, fetchImpl });
      const decisions = answersToDecisions(answers, prompt);
      const latencyMs = performance.now() - start;
      logEvent({ requestId, stage: "jev", model: JEV_MODEL_ID, latencyMs, status: "ok", questionCount: Object.keys(questions).length });
      return { decisions, latencyMs, fromFallback: false, questionCount: Object.keys(questions).length };
    } catch (err) {
      lastError = err;
      // Server-side only detail (HTTP status / parse cause). Never the key:
      // it travels in the Authorization header and is never logged.
      const detail = err instanceof Error ? err.message : "unknown error";
      logEvent({ requestId, stage: "jev", model: JEV_MODEL_ID, latencyMs: performance.now() - start, status: "error", note: `${attempt === 0 ? "retrying once" : "using fallback"}: ${detail}` });
    }
  }
  void lastError;
  const latencyMs = performance.now() - start;
  logEvent({ requestId, stage: "jev", model: JEV_MODEL_ID, latencyMs, status: "fallback", questionCount: Object.keys(questions).length });
  return { decisions: fallbackDecisions(prompt), latencyMs, fromFallback: true, questionCount: Object.keys(questions).length };
}
