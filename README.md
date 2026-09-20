# JevCanvas

**Decide. Generate. Render.**

A decision + diffusion engine for generative interfaces.

Jev decides the structure.
Diffusion creates visual assets.
json-render renders the application.

Describe an interface in natural language and watch the system build it from a
constrained component catalog, generating only the visual assets it actually needs.

## One-command setup

```bash
npm install
cp .env.example .env.local   # fill in AI_GATEWAY_API_KEY + REPLICATE_API_TOKEN
npm run dev
```

Checks:

```bash
npm run typecheck
npm test
python scripts/smoke.py
```

## Architecture

```text
USER REQUEST
     |
     v
   JEV (typesafe-ai/jev, typed boolean/choice/score decisions only)
     |
     v
 JSON SPEC (catalog-constrained candidates)
     |
     +---------------+
     v               v
DIFFUSION       COMPONENT DATA
assets (flux-schnell, max 3/gen)  |
     +---------------+
     v
 json-render (only renderer / capability boundary)
     |
     v
  LIVE UI --> Feedback / Eval --> JEV (accept / regenerate / fallback)
```

Jev never generates prose, JSX, or code. Diffusion never decides structure.
json-render is the only renderer; unknown components and invalid actions are
rejected before render.

## Layout note (PRD vs AGENTS)

PRD §47 suggests top-level `jev/`, `diffusion/`, `evaluation/`, `state/`,
`render/` folders. AGENTS.md §3 forbids folder sprawl and catch-all dirs, so
this repo uses the shallow form: everything domain-specific lives as files in
`lib/` (`jev.ts`, `composition.ts`, `diffusion.ts`, `assets.ts`,
`evaluation.ts`, `versions.ts`, `schemas.ts`, `benchmarks.ts`), the catalog +
registry live in `components/`, routes in `app/`. No `src/`, no extra
top-level folders.

## Environment

Server-only (never exposed to the browser):

```text
AI_GATEWAY_API_KEY
REPLICATE_API_TOKEN
```

Optional later: `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`, `REDIS_URL`.
See `.env.example` (names only, no values).

## json-render versions (pinned)

- `@json-render/core`: `0.21.0`
- `@json-render/react`: `0.21.0`
- `zod`: `4.3.6`

Real exports used: `Spec` (`{ root, elements, state? }`), `validateSpec`,
`defineCatalog`, `experimental_composeSpec`, `experimental_createEvaluator`,
`Renderer` / `defineRegistry` / `createRenderer`. The local renderer in
`components/registry.tsx` is intentionally dependency-free so `next build`
succeeds even when json-render is absent; `validateWithJsonRender()` in
`lib/composition.ts` prefers `validateSpec()` when installed and falls back to
the local zod `SpecSchema` otherwise.

Known drift: PRD §26 documents `POST /v1/evaluate`; json-render's
`experimental_createEvaluator` (v0.21.0) targets
`POST https://ai-gateway.vercel.sh/v4/ai/evaluation-model` with choice-only
questions. `lib/jev.ts` keeps the endpoint in one constant
(`JEV_EVALUATE_URL`) and supports boolean/choice/score, so the transport can be
swapped without touching call sites.

## Benchmark (stub)

| Pipeline | Path | Status |
| --- | --- | --- |
| A | LLM-only stub → json-render | mock, no keys |
| B | Jev + json-render | mock, no keys |
| C | Jev + Diffusion + json-render | mock, no keys |
| D | Closed-loop (eval + selective regen) | mock, no keys |

Run `npm test` for the mocked contract suite. Live-provider benchmarks require
keys and are out of scope for unit tests.
