# PRD: JevCanvas

**Product name:** JevCanvas  
**Working title:** JevCanvas: A Decision + Diffusion Engine for Generative Interfaces  
**Document type:** Product Requirements Document  
**Status:** Build-ready proposal / MVP specification  
**Target:** Public demo + open-source repository + technical write-up  
**Date:** 2026-09-21  
**Primary implementation:** Next.js + TypeScript + Vercel AI Gateway + Jev + json-render + image diffusion API  

---

## 1. Executive Summary

JevCanvas is a generative-interface system in which three different technologies have clearly separated jobs:

1. **Jev** makes fast, typed decisions about interface structure, component selection, layout, visual direction, and regeneration decisions.
2. **Diffusion** generates visual assets such as backgrounds, illustrations, decorative graphics, textures, and other image content on demand.
3. **json-render** turns a constrained JSON specification into the actual interactive interface.

The central idea is not to ask one generative model to create an entire application from scratch. Instead, the system decomposes interface generation into a decision layer, an asset-generation layer, and a deterministic rendering layer.

The intended experience is:

```text
User describes an interface
        |
        v
      JEV
        |
        +---- component selection
        +---- structure
        +---- layout
        +---- visual direction
        +---- asset requirements
        |
        v
   JSON-render Spec
        |
        +------------------+
        |                  |
        v                  v
 Components/Data       Diffusion
                         |
                         +---- background
                         +---- illustration
                         +---- decorative assets
                         +---- visual variants
        |                  |
        +---------+--------+
                  |
                  v
              Live UI
                  |
                  v
        Visual/semantic state
                  |
                  v
                 JEV
           accept / revise / regenerate
```

The project should demonstrate that a decision model and a generative model can be composed so that the expensive/free-form generation model is used only when necessary, while structure remains constrained and predictable.

---

## 2. Problem Statement

Current generative UI systems commonly use a language model to generate a text or JSON description of an interface. The generated specification is then parsed, validated, and rendered. This works, but one model is responsible for multiple fundamentally different tasks:

- deciding what components are needed;
- deciding where they belong;
- describing content;
- generating visual direction;
- creating image assets;
- revising the result.

This creates three problems.

### 2.1 Generation is expensive for decisions

Many UI decisions are closed-set decisions. For example:

- Does the page need a chart?
- Which chart variant?
- Does the dashboard need a sidebar?
- Which layout should be used?
- Is an illustration necessary?
- Is the generated visual good enough to reuse?

These are decisions, not prose-generation tasks. Jev is designed specifically for typed decisions rather than free-form text generation.

### 2.2 Free-form generation is difficult to constrain

A UI framework should control which components exist, which actions are legal, and which props are valid. json-render already addresses this by using catalogs and schemas to constrain generated specs.

### 2.3 Visual generation is a different problem from UI composition

A UI may need a custom visual identity that is not available in a static asset library. An image model can generate assets, but it should not control application structure or application actions.

JevCanvas separates these responsibilities.

---

## 3. Product Thesis

The product thesis is:

> **A generative interface should be assembled by a decision model, visually enhanced by a generative model, and executed by a deterministic renderer.**

More specifically:

> **Can a Jev-guided composition system with on-demand diffusion assets produce useful interfaces while reducing unnecessary free-form inference and preserving predictable UI structure?**

This is the core technical question of the project.

---

## 4. Project Goals

### 4.1 Primary goals

- Generate a complete interactive UI from a natural-language request.
- Use Jev for explicit, typed interface decisions.
- Use json-render as the rendering and component-constraint layer.
- Generate visual assets dynamically rather than relying on a fixed image library.
- Keep UI components and application actions deterministic and developer-defined.
- Support iterative editing of an already-generated interface.
- Demonstrate a closed-loop workflow where generated assets can be evaluated and selectively regenerated.
- Record enough telemetry to compare this architecture with a conventional LLM-only generative UI pipeline.
- Release a polished public demo as quickly as possible.
- Release the implementation as an open-source GitHub project.

### 4.2 Secondary goals

- Make the architecture provider-agnostic behind adapters.
- Support asset caching and deterministic seeds.
- Produce reproducible generation runs for evaluation.
- Make it easy to add new component candidates and asset types.
- Create a foundation for later research into compute-aware generative systems.

---

## 5. Non-Goals

The first version should explicitly avoid these:

- Training a new diffusion model.
- Fine-tuning Jev.
- Training a new UI foundation model.
- Letting an AI model execute arbitrary JavaScript or arbitrary application code.
- Letting an AI model invent components outside the developer-defined catalog.
- Using diffusion to generate HTML, React code, or the entire application.
- Replacing json-render with a custom renderer.
- Building a general-purpose design tool comparable to Figma.
- Creating a full design-to-code product.
- Claiming Jev is better than all LLMs without controlled evaluation.
- Claiming novelty simply because Jev and json-render are combined. json-render already has an experimental Jev composition path.

---

## 6. Why This Project Is Distinct

### Existing pieces

The current json-render repository already contains an experimental Jev composition API. Its Jev composer uses typed decisions to select configured component candidates, build a normal flat json-render `Spec`, and render the result through the existing registry.

Therefore:

```text
Jev + json-render
```

is **not** the core novelty of this project.

### JevCanvas contribution

The project should focus on:

```text
Jev decision layer
        +
Diffusion asset-generation layer
        +
json-render deterministic renderer
        +
closed-loop asset/interface evaluation
        +
compute/cost/latency measurement
```

The strongest product differentiator is the separation between:

- deciding the interface;
- creating visual assets;
- rendering the interface;
- deciding whether an expensive generation step was actually necessary.

The research novelty should be treated as a **hypothesis to validate**, not an assumed fact. A final paper or blog post should compare against relevant prior work before making novelty claims.

---

## 7. Target Users

### Primary user

Developers and AI builders who want to generate interactive interfaces from natural language without allowing unrestricted code generation.

### Secondary users

- AI application developers.
- Generative UI researchers.
- Vercel/json-render users.
- Designers exploring AI-assisted interface generation.
- Researchers studying model orchestration and inference efficiency.

---

## 8. Core User Experience

A user opens JevCanvas and enters:

> Create a futuristic AI research dashboard with a dark visual style, a paper-analysis section, model metrics, and a research timeline.

The system performs the following.

### Step 1: Understand the request

The request is sent to the composition layer.

### Step 2: Jev selects UI structure

Jev receives the user request plus available candidate descriptions.

It decides things such as:

```text
root = DashboardShell

include:
  Hero
  MetricCards
  ResearchTable
  Timeline
  Chart
  Sidebar

exclude:
  Checkout
  ContactForm
  Pricing
```

### Step 3: Build a JSON spec

The selected candidates are converted into a validated json-render `Spec`.

### Step 4: Identify visual assets

The spec may contain asset requirements such as:

```text
hero_background
research_illustration
section_decoration
```

### Step 5: Generate visual assets

The diffusion adapter generates only the assets that are actually needed.

### Step 6: Inject asset references

The generated asset URLs are inserted into the appropriate component props.

### Step 7: Render

json-render renders the interface.

### Step 8: Optional evaluation loop

The system creates structured metadata about the composition and assets.

Jev can evaluate:

- whether an asset fits the requested visual direction;
- whether a required visual concept is represented;
- whether another generation is justified;
- whether an asset should be reused;
- whether the UI composition satisfies a given high-level requirement.

### Step 9: Iterate

The user can say:

> Make the hero more minimal and replace the illustration with something more technical.

Jev decides which parts of the existing tree need changes. Diffusion regenerates only the affected asset.

---

## 9. System Architecture

```text
                                    +----------------+
                                    |     USER       |
                                    +-------+--------+
                                            |
                                            v
                                  +-------------------+
                                  | Request API Route |
                                  +---------+---------+
                                            |
                                            v
                                  +-------------------+
                                  |  JEV COMPOSER     |
                                  |                   |
                                  | structure         |
                                  | layout            |
                                  | visual direction  |
                                  | asset requirements|
                                  +---------+---------+
                                            |
                              +-------------+-------------+
                              |                           |
                              v                           v
                    +----------------+          +-------------------+
                    | JSON Spec      |          | Asset Plan        |
                    | / candidates  |          | asset type/prompt |
                    +-------+--------+          +---------+---------+
                            |                             |
                            |                             v
                            |                  +-------------------+
                            |                  | Diffusion Adapter |
                            |                  +---------+---------+
                            |                            |
                            |                            v
                            |                  +-------------------+
                            |                  | Asset Cache       |
                            |                  +---------+---------+
                            |                            |
                            +---------------+------------+
                                            |
                                            v
                                  +-------------------+
                                  | json-render       |
                                  | Renderer          |
                                  +---------+---------+
                                            |
                                            v
                                  +-------------------+
                                  | Interactive UI    |
                                  +---------+---------+
                                            |
                                      user edits / state
                                            |
                                            v
                                  +-------------------+
                                  | Feedback/Eval     |
                                  | layer             |
                                  +---------+---------+
                                            |
                                            v
                                           JEV
```

---

## 10. Component Responsibilities

### 10.1 Frontend

Responsibilities:

- prompt input;
- generation progress;
- streamed or progressive spec preview;
- rendered UI preview;
- version history;
- regenerate controls;
- asset previews;
- evaluation/debug panel;
- latency/cost metadata for demonstration.

Suggested stack:

- Next.js
- React
- TypeScript
- Tailwind CSS or project-consistent styling
- json-render React renderer

### 10.2 Jev Composer

Responsibilities:

- transform natural-language intent into typed decisions;
- select components from candidate set;
- determine high-level composition;
- select layout candidates;
- choose visual direction from predefined visual vocabulary;
- determine which assets are required;
- evaluate revision requests;
- optionally decide whether regeneration is needed.

Jev must not execute application actions.

### 10.3 json-render

Responsibilities:

- validate component recipes;
- maintain predictable structure;
- render components;
- handle supported bindings/state;
- execute developer-defined action handlers only.

json-render is the execution/rendering layer, not the model.

### 10.4 Diffusion Adapter

Responsibilities:

- receive a typed asset-generation request;
- generate the image;
- return a URL/path/object reference;
- expose provider-neutral metadata;
- support retries;
- support caching;
- support deterministic seeds when possible.

The first adapter should be small and provider-specific details should stay outside the core pipeline.

### 10.5 Asset Cache

Responsibilities:

- avoid regenerating identical assets;
- cache by normalized prompt + model + generation parameters + seed;
- optionally cache semantic asset IDs;
- track generation timestamps and provider metadata.

---

## 11. Model Strategy

### 11.1 Jev

Use:

```text
Model ID: typesafe-ai/jev
```

For new Vercel AI Gateway code, the preferred interface is the evaluation API.

Vercel currently documents Jev as an evaluation model that accepts shared state and typed questions, including Boolean, Choice, and Score questions. Multiple questions can be evaluated in one request.

Current Vercel model pricing shown on the model page is approximately:

```text
$0.04 / 1M input tokens
```

Pricing and availability should be rechecked before publication because the model is early access and commercial terms can change.

### 11.2 Diffusion

For the first MVP, use an external image-generation adapter rather than hosting a large diffusion model locally.

A practical MVP option is:

```text
Replicate
  -> black-forest-labs/flux-schnell
```

The current Replicate page describes FLUX.1 [schnell] as a fast image-generation model capable of 1–4 inference steps. The current listed price is approximately $3 per 1,000 output images.

The project must keep the diffusion provider behind an interface so that the provider can later be replaced with:

- local FLUX/ComfyUI;
- another hosted diffusion provider;
- a newer image model;
- a custom fine-tuned model.

### 11.3 Why diffusion is separate

Diffusion is not responsible for:

- selecting UI components;
- generating JSON specs;
- executing UI actions;
- deciding application logic.

Diffusion is responsible for visual assets only in MVP.

---

## 12. Predefined Assets vs Generated Assets

### Do we need predefined pictures?

**No.** The project should not depend on a fixed image library.

Instead, the developer defines **asset types and constraints**, while the diffusion system generates the concrete image.

Example:

```text
Developer-defined asset type:
  HeroBackground

Jev decision:
  required = true

Asset generation request:
  style = dark futuristic
  subject = abstract AI research
  aspect_ratio = 16:9
  purpose = hero background

Diffusion:
  generates actual image
```

### What must be predefined?

The following should be predefined:

- UI components;
- component schemas;
- allowed actions;
- allowed asset categories;
- candidate descriptions;
- visual style vocabulary;
- application state shape;
- validation rules.

The **actual pictures do not have to be predefined**.

---

## 13. Initial Component Catalog

Keep the first catalog deliberately small.

Recommended v1 components:

```text
PageShell
Section
Hero
Heading
Paragraph
MetricCard
Card
Button
Badge
Tabs
Chart
Table
Timeline
Image
Grid
Stack
Divider
``` 

Additional components should be added only after the basic pipeline works.

Every component must have:

- a stable type name;
- a schema for props;
- a candidate description;
- optional named slots;
- explicitly declared events;
- explicitly declared allowed actions.

---

## 14. Initial Asset Catalog

The asset system should begin with a small number of categories:

```text
HeroBackground
Illustration
SectionDecoration
ProductMockup
ResearchGraphic
Avatar/Portrait
Texture
IconLikeGraphic
```

The MVP does not need to support all categories equally. A recommended first release is:

```text
HeroBackground
Illustration
SectionDecoration
```

---

## 15. Visual Style Vocabulary

Jev should not be asked to invent arbitrary style parameters at first.

Provide controlled choices such as:

```text
minimal
editorial
technical
futuristic
soft
corporate
brutalist
playful
monochrome
high-contrast
```

Jev may select from these.

The diffusion prompt builder converts the selected style into an image-generation prompt.

Example:

```json
{
  "style": "technical",
  "palette": "dark monochrome",
  "assetPurpose": "hero_background",
  "composition": "large negative space for foreground text"
}
```

---

## 16. JEV Question Design

Jev works best when questions are atomic and bounded.

Do not ask:

```text
"Design the entire application."
```

Instead ask independent questions.

Example:

```typescript
const questions = {
  pageType: {
    type: "choice",
    instructions: "What page archetype best matches the request?",
    criteria: {
      dashboard: "Metric-heavy application or operational dashboard",
      landing: "Promotional or marketing page",
      profile: "Profile, portfolio, or identity page",
      article: "Long-form reading page",
      workspace: "Interactive application workspace"
    }
  },

  needsHero: {
    type: "boolean",
    instructions: "Does the requested interface need a prominent hero section?"
  },

  visualStyle: {
    type: "choice",
    instructions: "Which visual style best matches the request?",
    criteria: {
      minimal: "Clean, sparse, restrained",
      technical: "Technical, data-oriented, precise",
      futuristic: "Advanced, digital, speculative",
      editorial: "Publication-oriented, typography-led",
      corporate: "Professional business-oriented"
    }
  },

  visualIntensity: {
    type: "score",
    instructions: "How visually expressive should the interface be?",
    criteria: [
      "mostly functional and restrained",
      "moderately visual",
      "highly visual and expressive"
    ]
  }
};
```

The exact schema can change during implementation, but the principle should remain: **many small questions in one request rather than one giant question**.

---

## 17. Candidate-Based Composition

A key part of the architecture is that Jev selects among prepared candidate recipes.

Example:

```typescript
const candidates = [
  {
    id: "hero-01",
    description: "Large hero section with headline and generated visual background",
    element: {
      type: "Hero",
      props: {
        title: "..."
      }
    }
  },
  {
    id: "metrics-01",
    description: "Four compact metric cards for dashboard statistics",
    element: {
      type: "MetricCard",
      props: {
        items: []
      }
    }
  }
];
```

The model does not invent a new React component named `CoolAnalyticsThing`.

It chooses from the catalog/candidate space supplied by the application.

---

## 18. Asset Planning

After the composition decision, convert selected UI elements into an asset plan.

Example:

```json
{
  "assets": [
    {
      "id": "hero-bg",
      "type": "HeroBackground",
      "required": true,
      "purpose": "Hero section background",
      "style": "technical",
      "aspectRatio": "16:9"
    },
    {
      "id": "research-illustration",
      "type": "Illustration",
      "required": true,
      "purpose": "Visual accompanying research section",
      "style": "technical",
      "aspectRatio": "4:3"
    }
  ]
}
```

The asset plan is deterministic and validated before the diffusion provider is called.

---

## 19. Diffusion Prompt Construction

Do not send the raw user prompt blindly to the diffusion model.

Build a structured prompt from:

```text
user intent
+
asset purpose
+
selected visual style
+
composition requirements
+
aspect ratio
+
known content constraints
```

Example:

```text
Create a dark technical hero background for an AI research dashboard.
Minimal central visual density.
Leave substantial negative space for white interface text.
Abstract scientific/AI imagery.
No readable text.
No logos.
Wide 16:9 composition.
```

This makes generation reproducible and easier to benchmark.

---

## 20. Closed-Loop Evaluation

This is the feature that turns the project into more than a simple wrapper.

After generating an asset, create a compact structured state describing the request and generated result.

Example:

```json
{
  "asset": {
    "id": "hero-bg",
    "purpose": "hero background",
    "style": "technical"
  },
  "generation": {
    "model": "flux-schnell",
    "seed": 12345,
    "width": 1344,
    "height": 768
  },
  "expected": {
    "negativeSpace": true,
    "noText": true,
    "dark": true,
    "technical": true
  }
}
```

Jev can evaluate bounded questions such as:

```text
Does the generated asset fit the requested visual style?
Does it appear suitable as a hero background?
Is another generation likely to be useful?
Should this asset be accepted, regenerated, or escalated?
```

Important: Jev cannot inspect raw pixels directly in this architecture if the deployed Jev interface is text/structured-state based. The system therefore needs an intermediate representation such as:

- image caption;
- vision-encoder tags;
- CLIP-like similarity scores;
- OCR result;
- image metadata;
- layout measurements.

For the MVP, use a vision-language model or image analysis service to turn the generated image into structured state. Keep that adapter separate from Jev.

---

## 21. Feedback Loop Example

```text
User request
   ↓
Jev chooses interface
   ↓
json-render preview
   ↓
Asset requirements extracted
   ↓
Diffusion generates asset
   ↓
Vision/feature extractor
   ↓
structured asset state
   ↓
Jev evaluates fit
   ↓
┌────────────────────────────┐
│ high confidence → accept   │
│ low confidence  → regenerate│
│ uncertain       → fallback │
└────────────────────────────┘
   ↓
final json-render interface
```

The system should cap retries to prevent runaway generation.

Recommended MVP maximum:

```text
2 asset generations per asset
```

or:

```text
1 initial generation + 1 refinement
```

---

## 22. Editing Workflow

Existing spec:

```text
User:
"Move the timeline above the chart and replace the hero illustration."
```

Jev evaluates the current tree plus available candidates.

Jev chooses:

```text
move timeline
regenerate hero illustration
```

The system should not regenerate unrelated elements.

Expected behavior:

```text
UNCHANGED:
metrics
research table
chart
buttons
state

CHANGED:
timeline position
hero illustration
```

This incremental behavior is important for latency and cost.

---

## 23. State Model

The application needs at least four state layers.

### 23.1 User state

```typescript
interface UserRequestState {
  prompt: string;
  selectedVersion?: string;
}
```

### 23.2 Composition state

```typescript
interface CompositionState {
  pageType: string;
  components: string[];
  layout: string;
  visualStyle: string;
}
```

### 23.3 Asset state

```typescript
interface AssetState {
  id: string;
  type: string;
  status: "planned" | "generating" | "ready" | "failed";
  url?: string;
  prompt?: string;
  model?: string;
  seed?: number;
}
```

### 23. Evaluation state

```typescript
interface EvaluationState {
  accepted?: boolean;
  probability?: number;
  reasonCode?: string;
  evaluatedAt?: string;
}
```

---

## 24. Versioning

Every generated UI should become a versioned artifact.

Example:

```text
Version 1
  ↓
Version 2: "make it darker"
  ↓
Version 3: "add research timeline"
  ↓
Version 4: "replace illustration"
```

Keep:

- prompt;
- resulting spec;
- asset manifest;
- generation parameters;
- model identifiers;
- Jev decisions;
- diffusion outputs;
- timings;
- evaluation results.

This creates reproducibility and makes the demo more impressive.

---

## 25. Data Persistence

MVP can avoid a full database.

For the first demo:

```text
browser session
+
server-side temporary storage
```

For v1 public deployment, consider:

- Vercel Blob for assets;
- Vercel KV/Redis or another small store for metadata;
- Postgres for persistent project/version metadata.

Do not over-engineer persistence before the pipeline works.

---

## 26. Required APIs

### Vercel AI Gateway / Jev

Preferred new interface:

```text
POST https://ai-gateway.vercel.sh/v1/evaluate
```

Example:

```json
{
  "model": "typesafe-ai/jev",
  "state": {
    "prompt": "Create a futuristic AI research dashboard",
    "availableComponents": ["Hero", "Chart", "Table", "Timeline", "MetricCard"]
  },
  "questions": {
    "needsHero": {
      "type": "boolean",
      "instructions": "Does the requested interface need a prominent hero section?"
    },
    "layout": {
      "type": "choice",
      "instructions": "Which layout best fits the request?",
      "criteria": {
        "dashboard": "Dense information dashboard",
        "editorial": "Reading-oriented layout",
        "landing": "Promotional landing page"
      }
    }
  }
}
```

Authentication:

```text
Authorization: Bearer $AI_GATEWAY_API_KEY
```

### Native TypeSafe-compatible API option

Existing TypeSafe clients can instead use:

```text
https://ai-gateway.vercel.sh/typesafe/v1/systemone
```

with the TypeSafe-native request format.

Use this route primarily when integrating the TypeSafe SDK directly. For new application code, prefer Vercel's Evaluation API because it is the abstraction Vercel currently documents for new evaluation-model integrations.

### Diffusion

Initial provider:

```text
Replicate
model: black-forest-labs/flux-schnell
```

Authentication:

```text
REPLICATE_API_TOKEN
```

Provider must be wrapped behind a local interface.

---

## 27. API Route Design

Recommended Next.js server routes:

```text
/api/generate
/api/edit
/api/assets/generate
/api/assets/regenerate
/api/evaluate
/api/projects
```

### `/api/generate`

Input:

```json
{
  "prompt": "Create a futuristic AI research dashboard"
}
```

Output:

```json
{
  "versionId": "v1",
  "spec": {},
  "assets": [],
  "decisions": {},
  "timing": {}
}
```

### `/api/edit`

Input:

```json
{
  "versionId": "v1",
  "prompt": "Move the chart above the table"
}
```

Output:

```json
{
  "versionId": "v2",
  "spec": {},
  "changedAssets": []
}
```

### `/api/assets/generate`

Input:

```json
{
  "assetId": "hero-bg",
  "prompt": "...",
  "aspectRatio": "16:9",
  "seed": 123
}
```

Output:

```json
{
  "assetId": "hero-bg",
  "url": "...",
  "provider": "replicate",
  "model": "flux-schnell"
}
```

---

## 28. Error Handling

The system must handle:

### Jev failure

Fallback:

```text
keep last known valid spec
```

Never discard a working UI solely because a refinement decision failed.

### Diffusion failure

Fallback options:

1. reuse cached asset;
2. use a developer-defined placeholder;
3. render the component without the visual asset.

### Invalid candidate

Reject before rendering.

### Invalid action

Never execute arbitrary action names from model output.

### Retry limit

Hard cap all AI-driven retries.

### Timeout

Use server-level request deadlines.

---

## 29. Security Model

The model should never have direct control over:

- filesystem access;
- arbitrary HTTP requests;
- database writes;
- shell commands;
- application credentials;
- arbitrary React/JavaScript execution.

json-render components and action handlers define the capability boundary.

All action handlers must perform server-side validation and authorization even if the action is exposed through a trusted catalog.

API keys remain server-side.

Required environment variables:

```text
AI_GATEWAY_API_KEY
REPLICATE_API_TOKEN
```

Optional later:

```text
BLOB_READ_WRITE_TOKEN
DATABASE_URL
REDIS_URL
```

Never expose server secrets to the browser.

---

## 30. Safety and Content Controls

The project needs two separate safety layers.

### Deterministic controls

Handle through code/provider settings:

- file type restrictions;
- URL validation;
- max prompt length;
- maximum image count;
- image dimensions;
- action authorization;
- generation budget;
- timeout;
- retry count.

### Semantic controls

Jev can provide semantic checks such as:

```text
Does this asset match the user's requested category?
Is this generated result inappropriate for this interface?
Does this request ask for a disallowed visual category?
```

Jev should not be the only safety mechanism.

---

## 31. Cost Controls

Every request should have a budget.

Suggested MVP defaults:

```text
max Jev evaluations per generation: 4–8
max asset generations: 3
max regeneration attempts per asset: 1
max assets per page: 6
```

Cache identical assets.

Avoid generating decorative visuals unless Jev or deterministic rules mark them as useful.

A key KPI is:

```text
cost per completed interface
```

not merely cost per API call.

---

## 32. Performance Targets

Initial MVP targets:

```text
First structured composition: < 2 seconds target
First visible UI preview: < 3 seconds target
First visual asset: < 8 seconds target
Typical complete interface: < 15 seconds target
```

These are engineering targets, not guaranteed provider SLAs.

Measure separately:

- Jev latency;
- diffusion latency;
- rendering latency;
- asset upload latency;
- total latency.

---

## 33. Streaming

Use json-render's progressive/spec streaming capabilities when practical.

Recommended behavior:

```text
0s       prompt submitted
 |
 +--> composition decision
 |
 +--> preliminary spec appears
 |
 +--> visual assets generate
 |
 +--> asset URLs appear
 |
 +--> final render
```

The first preview should not wait unnecessarily for every decorative image.

A useful strategy is:

```text
render structure immediately
then progressively attach assets
```

This makes the demo feel much faster.

---

## 34. MVP Scope

### MVP v0.1

Build only:

```text
Prompt
  ↓
Jev
  ↓
6–10 components
  ↓
json-render
  ↓
3 asset categories
  ↓
Flux Schnell
  ↓
final UI
```

No advanced feedback loop is required for the first working milestone.

### MVP v0.2

Add:

```text
versioning
editing
asset caching
streaming
basic evaluation
```

### MVP v0.3

Add:

```text
closed-loop regeneration
confidence-aware decisions
cost/latency dashboard
benchmark mode
```

---

## 35. Demo Scenarios

The public demo should support at least five showcase prompts.

### Scenario 1: AI dashboard

```text
Create a futuristic AI research dashboard with metrics, a timeline, and a paper table.
```

### Scenario 2: Portfolio

```text
Create a technical portfolio for a machine learning researcher with publications, projects, and a dark editorial style.
```

### Scenario 3: Product page

```text
Create a premium landing page for an autonomous driving platform with a technical visual style.
```

### Scenario 4: Music workspace

```text
Create a futuristic music production workspace with a large visualizer, controls, and track panels.
```

### Scenario 5: Simulation dashboard

```text
Create a CARLA autonomous driving dashboard showing vehicle status, risk, telemetry, and route information.
```

The fifth is especially suitable for a personal showcase because it connects the architecture to a technically meaningful domain.

---

## 36. Demo UI Layout

The website should have three major areas.

```text
+-----------------------------------------------------------+
| JevCanvas                                  New / History  |
+-----------------------------------------------------------+
| Prompt                                                    |
| [ Describe the interface you want...              ]      |
| [Generate]                                                |
+-----------------------------------------------------------+
|                                                           |
|                    LIVE GENERATED UI                      |
|                                                           |
|                                                           |
+-----------------------------------------------------------+
| Generation / Decision Inspector                           |
|                                                           |
| Jev decisions | Assets | Timing | Cost | Version history  |
+-----------------------------------------------------------+
```

The inspector is important for the technical story. The project should expose the pipeline rather than hide it completely.

---

## 37. Technical Inspector

For every generation run, show:

```text
Jev
  pageType = dashboard
  visualStyle = technical
  needsHero = true
  needsIllustration = true

json-render
  components = 11
  validSpec = true

Diffusion
  model = flux-schnell
  assetsGenerated = 2
  cacheHits = 1

Performance
  Jev = 340 ms
  Diffusion = 3.2 s
  Render = 70 ms
  Total = 3.9 s
```

This makes the demo legible to technical audiences.

---

## 38. Benchmark Plan

The project should contain a reproducible benchmark mode.

### Baseline A: LLM-only

```text
User prompt
  ↓
Generative LLM
  ↓
JSON UI spec
  ↓
json-render
```

### Baseline B: Jev + json-render

```text
User prompt
  ↓
Jev
  ↓
json-render
```

### Proposed C: Jev + Diffusion + json-render

```text
User prompt
  ↓
Jev
  ↓
json-render
  +
Diffusion assets
  ↓
final UI
```

### Proposed D: closed-loop version

```text
User prompt
  ↓
Jev
  ↓
Diffusion
  ↓
Evaluation
  ↓
Selective regeneration
  ↓
Final UI
```

---

## 39. Metrics

Measure at least:

### Product metrics

- task completion;
- subjective visual quality;
- structural correctness;
- edit success rate;
- asset relevance;
- regeneration success rate.

### Systems metrics

- total latency;
- Jev latency;
- diffusion latency;
- number of model calls;
- number of generated images;
- cache hit rate;
- estimated cost;
- tokens consumed;
- failed generations.

### Research metrics

- quality vs cost;
- quality vs latency;
- unnecessary generation rate;
- regeneration rate;
- first-pass acceptance rate;
- semantic evaluator agreement;
- decision confidence calibration where applicable.

---

## 40. Hypotheses

### H1

Jev can select useful interface structures without free-form text generation.

### H2

On-demand visual asset generation can increase visual variety without requiring a permanent asset library.

### H3

Separating UI structure from visual asset generation makes generated interfaces easier to constrain and validate.

### H4

Jev-guided regeneration can reduce unnecessary image generations compared with always regenerating assets.

### H5

A closed-loop Jev + diffusion system can improve quality-per-dollar compared with a naive generate-everything pipeline.

These are hypotheses. The benchmark determines whether they hold.

---

## 41. Research Questions

Primary:

> Can a typed decision model coordinate an image-generation model and a deterministic rendering framework more efficiently than an LLM-only generative UI pipeline?

Secondary:

- How much of UI generation is naturally expressible as closed-set decisions?
- Does candidate-constrained composition reduce invalid UI states?
- How often does on-demand asset generation actually improve perceived quality?
- How accurately can a decision model determine whether a generated asset should be regenerated?
- What is the relationship between decision confidence and successful interface outcomes?
- How much compute is saved through asset reuse and selective regeneration?
- How does the architecture scale as the candidate catalog grows?

---

## 42. Novelty Positioning

Do not market the project as:

> "The first Jev generative UI system."

That would be incorrect because json-render already exposes an experimental Jev composer.

Instead, position it as:

> **A modular architecture for generative interfaces that separates decision-making, visual generation, and deterministic rendering.**

A stronger research-oriented framing is:

> **Jev-guided adaptive asset generation for constrained generative UI.**

The novelty claim should remain conditional until a broader prior-art review is completed.

---

## 43. Repository

Primary json-render repository:

https://github.com/vercel-labs/json-render

json-render Jev documentation:

https://json-render.dev/docs/jev

The repository currently describes json-render as a generative UI framework using a constrained catalog/spec approach. The Jev experiment uses `experimental_composeSpec` and `experimental_createEvaluator` and is documented as experimental/unreleased in the current source docs.

Jev model page on Vercel AI Gateway:

https://vercel.com/ai-gateway/models/jev

Vercel Evaluation documentation:

https://vercel.com/docs/ai-gateway/modalities/evaluation

Vercel Evaluation quickstart:

https://vercel.com/docs/ai-gateway/getting-started/evaluation

Vercel TypeSafe-compatible API:

https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe

TypeSafe documentation:

https://docs.typesafe.ai/introduction

TypeSafe API:

https://docs.typesafe.ai/api

TypeSafe quickstart:

https://docs.typesafe.ai/introduction/quickstart

TypeSafe Jev announcement:

https://typesafe.ai/blog/introducing-system-one-models-and-jev

---

## 44. Current API Facts To Preserve During Implementation

As checked for this PRD:

- Jev is exposed on Vercel AI Gateway as `typesafe-ai/jev`.
- Vercel documents Jev as an evaluation model, not a normal chat model.
- Vercel's Evaluation API uses shared `state` plus typed `questions`.
- The supported question concepts include Boolean, Choice, and Score.
- Multiple questions can be evaluated in one request.
- json-render already includes an experimental Jev composition path.
- json-render's experimental Jev APIs are marked experimental/unreleased in its current docs.
- json-render's Jev composer expects a developer-defined catalog and candidate recipes rather than unrestricted component invention.
- A separate asset-generation pipeline is therefore appropriate for dynamic images.

These facts should be rechecked before release because the APIs are changing rapidly.

---

## 45. Current Diffusion MVP Facts

The first diffusion integration may use:

```text
Replicate
black-forest-labs/flux-schnell
```

Current public documentation indicates:

- 1–4 inference steps are supported;
- 4 steps are recommended by the provider for normal use;
- `num_outputs` supports multiple outputs in one call;
- `aspect_ratio` is configurable;
- output can be WebP;
- the current listed price is around $3 per 1,000 output images.

The adapter must not assume these exact settings remain unchanged.

Reference:

https://replicate.com/black-forest-labs/flux-schnell/api/schema

---

## 46. Suggested Technology Stack

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
json-render React renderer
```

### AI orchestration

```text
Vercel AI Gateway
Jev
AI SDK evaluation API where appropriate
```

### UI composition

```text
@json-render/core
@json-render/react
zod
```

### Image generation

```text
Replicate API
FLUX.1 [schnell]
```

### Storage

MVP:

```text
in-memory / browser session
```

Later:

```text
Vercel Blob
Postgres
Redis/KV
```

### Deployment

```text
Vercel
```

---

## 47. Suggested Repository Structure

```text
jevcanvas/
├── app/
│   ├── page.tsx
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts
│   │   ├── edit/
│   │   │   └── route.ts
│   │   ├── evaluate/
│   │   │   └── route.ts
│   │   └── assets/
│   │       ├── generate/
│   │       │   └── route.ts
│   │       └── regenerate/
│   │           └── route.ts
│   └── projects/
│       └── [id]/
│           └── page.tsx
│
├── components/
│   ├── prompt-input.tsx
│   ├── preview.tsx
│   ├── inspector.tsx
│   ├── version-history.tsx
│   ├── asset-panel.tsx
│   └── metrics-panel.tsx
│
├── render/
│   ├── catalog.ts
│   ├── registry.tsx
│   ├── candidates.ts
│   └── actions.ts
│
├── jev/
│   ├── evaluator.ts
│   ├── questions.ts
│   ├── composer.ts
│   ├── editor.ts
│   └── schemas.ts
│
├── diffusion/
│   ├── types.ts
│   ├── provider.ts
│   ├── replicate.ts
│   ├── prompt-builder.ts
│   ├── asset-planner.ts
│   └── cache.ts
│
├── evaluation/
│   ├── asset-evaluator.ts
│   ├── ui-evaluator.ts
│   ├── benchmark.ts
│   └── metrics.ts
│
├── state/
│   ├── types.ts
│   └── versions.ts
│
├── lib/
│   ├── env.ts
│   ├── ids.ts
│   ├── logging.ts
│   └── timing.ts
│
├── tests/
│   ├── composition/
│   ├── diffusion/
│   ├── integration/
│   └── benchmark/
│
├── public/
├── .env.example
├── package.json
├── README.md
└── PRD.md
```

---

## 48. Environment Variables

`.env.local`:

```bash
AI_GATEWAY_API_KEY=...
REPLICATE_API_TOKEN=...
```

Optional later:

```bash
BLOB_READ_WRITE_TOKEN=...
DATABASE_URL=...
REDIS_URL=...
```

Never commit real values.

---

## 49. Implementation Order

### Phase 0: Repository setup

- Create Next.js app.
- Add TypeScript.
- Add json-render dependencies or compatible source revision.
- Pin versions for the experimental json-render Jev implementation.
- Add environment variable validation.

### Phase 1: Basic json-render app

Build a static UI from a hard-coded Spec.

Success condition:

```text
json-render renders the developer-defined catalog correctly.
```

### Phase 2: Basic Jev composition

Connect the Vercel AI Gateway evaluation API.

Success condition:

```text
prompt → Jev → component decisions → valid Spec → render
```

### Phase 3: Diffusion asset adapter

Implement:

```text
asset request → Replicate → image URL
```

Success condition:

```text
A generated image appears inside the rendered interface.
```

### Phase 4: Combined generation

Connect:

```text
Jev → JSON spec + asset plan
Diffusion → assets
json-render → final interface
```

Success condition:

```text
A prompt creates a usable interface with dynamically generated visual assets.
```

### Phase 5: Editing

Support natural-language edits.

Success condition:

```text
Existing interface + edit prompt → targeted modification
```

### Phase 6: Evaluation loop

Add structured asset evaluation and selective regeneration.

Success condition:

```text
bad/uncertain asset → regenerate only when necessary
```

### Phase 7: Benchmark

Implement LLM-only, Jev-only, and proposed pipeline comparisons.

### Phase 8: Public launch

- polished UI;
- live demo;
- README;
- architecture image;
- benchmark table;
- short demo video;
- technical write-up.

---

## 50. MVP Acceptance Criteria

The MVP is complete when all of these are true:

### Core generation

- [ ] User can enter a natural-language interface request.
- [ ] Jev receives structured state and typed questions.
- [ ] Jev selects from a developer-defined candidate catalog.
- [ ] A valid json-render Spec is produced.
- [ ] The Spec renders in the browser.

### Diffusion

- [ ] At least one external diffusion provider works.
- [ ] At least one image asset can be generated dynamically.
- [ ] Generated asset can be inserted into the Spec.
- [ ] Asset generation failures do not destroy an otherwise valid UI.
- [ ] Identical asset requests can be cached.

### Editing

- [ ] User can modify an existing interface with a second prompt.
- [ ] Unrelated assets are not regenerated unnecessarily.
- [ ] Version history is preserved.

### Observability

- [ ] Jev latency is logged.
- [ ] Diffusion latency is logged.
- [ ] Number of AI calls is logged.
- [ ] Asset count is logged.
- [ ] Total generation duration is logged.

### Safety

- [ ] AI cannot execute arbitrary code.
- [ ] API keys stay server-side.
- [ ] Actions are catalog-constrained.
- [ ] Generation limits exist.
- [ ] Retry limits exist.

---

## 51. Definition of Done for Public Demo

The demo should:

1. Generate a visually coherent interface from one prompt.
2. Clearly show that Jev made the structural decisions.
3. Clearly show that diffusion generated the visual assets.
4. Clearly show that json-render rendered the interface.
5. Allow at least one follow-up edit.
6. Complete a typical generation within a reasonable interactive time.
7. Show basic latency and generation metadata.
8. Recover gracefully from a failed asset request.
9. Have a clean README and one-command local setup.
10. Have an architecture diagram.

---

## 52. Future Extensions

Once the MVP is stable, possible extensions include:

### 52.1 Multiple visual candidates

Generate 2–4 low-cost assets and use Jev to select one.

```text
prompt
 ↓
diffusion × 4
 ↓
feature extraction
 ↓
Jev
 ↓
selected asset
```

### 52.2 Adaptive generation budget

Jev decides whether another diffusion pass is worth the cost.

### 52.3 Visual style memory

Store accepted assets and infer reusable style profiles.

### 52.4 User preference learning

Use accepted/rejected generated interfaces to maintain a project-level visual preference state.

### 52.5 Multi-model diffusion routing

Jev chooses among:

```text
fast model
quality model
specialized model
local model
```

### 52.6 Video assets

Use a similar architecture for generated motion backgrounds or product demonstrations.

### 52.7 3D assets

Extend the asset adapter to generated 3D scenes or Gaussian splats while keeping json-render as the UI composition layer.

### 52.8 Automatic benchmark harness

Run hundreds of prompts and produce an automated quality/cost/latency report.

---

## 53. Strongest Public Story

The project's public explanation should be simple:

> **Jev decides what the interface needs. Diffusion creates the visuals. json-render builds the actual interface.**

Then demonstrate:

```text
"Build me a futuristic AI research dashboard"
```

and show the entire pipeline.

A second prompt should demonstrate editability:

```text
"Replace the research illustration with something more scientific and move the timeline above the chart."
```

The visual should visibly change without rebuilding unrelated parts.

---

## 54. Suggested Project Tagline

Primary:

> **Decide. Generate. Render.**

Alternatives:

> **Jev decides. Diffusion creates. json-render renders.**

> **A decision-driven engine for generative interfaces.**

> **Generative UI without giving one model control of everything.**

---

## 55. Suggested GitHub README Opening

```text
# JevCanvas

A decision + diffusion engine for generative interfaces.

Jev decides the structure.
Diffusion creates visual assets.
json-render renders the application.

Describe an interface in natural language and watch the system build it from a constrained component catalog, generating only the visual assets it actually needs.
```

---

## 56. Suggested Demo Video Sequence

Target duration: 45–90 seconds.

```text
0–5s
Show blank JevCanvas.

5–10s
Enter prompt.

10–20s
Show Jev decisions in inspector.

20–35s
Show UI appearing.

35–45s
Show diffusion asset appearing.

45–60s
Show final interface.

60–75s
Type a follow-up edit.

75–90s
Show targeted change + inspector metrics.
```

End frame:

```text
JEV
↓
DECIDE

DIFFUSION
↓
CREATE

JSON-RENDER
↓
RENDER
```

---

## 57. Risks and Mitigations

### Risk: Jev chooses poor compositions

Mitigation:

- small candidate set;
- better candidate descriptions;
- benchmark prompts;
- deterministic layout constraints;
- fallback templates.

### Risk: Diffusion produces visually poor assets

Mitigation:

- fixed prompt templates;
- aspect-ratio-aware prompts;
- style vocabulary;
- cached high-quality assets;
- regeneration cap;
- fallback placeholders.

### Risk: Generated visuals clash with UI

Mitigation:

- generate assets with explicit purpose;
- reserve negative space for text;
- constrain palette/style;
- run structured visual evaluation.

### Risk: Project becomes too large

Mitigation:

Build only three asset categories and 6–10 components initially.

### Risk: Research claim is weak

Mitigation:

Benchmark against an LLM-only pipeline and report actual results.

### Risk: Experimental APIs change

Mitigation:

- pin exact versions;
- isolate provider code;
- record commit/version used for experiments;
- monitor release notes.

---

## 58. Important Design Principle

The architecture should always preserve this boundary:

```text
                    GENERATIVE
                       MODELS
                         |
              +----------+----------+
              |                     |
            Jev                  Diffusion
              |                     |
          decisions              assets
              |                     |
              +----------+----------+
                         |
                         v
                  DETERMINISTIC
                    RENDERING
                         |
                         v
                    json-render
```

Neither model should be responsible for tasks better handled by another layer.

---

## 59. Final Product Definition

### JevCanvas is:

A constrained generative interface engine that combines a fast typed decision model, an image diffusion model, and json-render to create and iteratively modify interactive interfaces from natural language.

### JevCanvas is not:

A chatbot that happens to output JSON.

A diffusion model that happens to render a webpage.

A code-generation agent.

A static collection of pre-made image assets.

The intended abstraction is:

```text
                    USER INTENT
                         |
                         v
              +---------------------+
              |         JEV         |
              | typed decisions     |
              +----------+----------+
                         |
               +---------+---------+
               |                   |
               v                   v
        STRUCTURAL SPEC       ASSET PLAN
               |                   |
               v                   v
         JSON-RENDER           DIFFUSION
               |                   |
               +---------+---------+
                         |
                         v
                   LIVE INTERFACE
                         |
                         v
                 EVALUATE / EDIT
                         |
                         +---------> JEV
```

That is the system to build.

---

## 60. Reference Links

### Core project

- [json-render GitHub](https://github.com/vercel-labs/json-render)
- [json-render Jev experimental documentation](https://json-render.dev/docs/jev)

### Jev / TypeSafe

- [TypeSafe Introduction](https://docs.typesafe.ai/introduction)
- [TypeSafe API](https://docs.typesafe.ai/api)
- [TypeSafe Quick Start](https://docs.typesafe.ai/introduction/quickstart)
- [TypeSafe SDKs](https://docs.typesafe.ai/sdk)
- [TypeSafe Jev Announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

### Vercel AI Gateway

- [Jev on Vercel AI Gateway](https://vercel.com/ai-gateway/models/jev)
- [AI Gateway Evaluation](https://vercel.com/docs/ai-gateway/modalities/evaluation)
- [Evaluation Quickstart](https://vercel.com/docs/ai-gateway/getting-started/evaluation)
- [TypeSafe API with AI Gateway](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe)
- [TypeSafe Jev availability announcement](https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway)

### Diffusion

- [FLUX.1 [schnell] on Replicate](https://replicate.com/black-forest-labs/flux-schnell)
- [FLUX.1 [schnell] API](https://replicate.com/black-forest-labs/flux-schnell/api)
- [FLUX.1 [schnell] schema](https://replicate.com/black-forest-labs/flux-schnell/api/schema)

---

## 61. Implementation Checklist

### Foundation

- [ ] Initialize Next.js app.
- [ ] Install/pin json-render packages or source revision.
- [ ] Create component catalog.
- [ ] Create React renderer registry.
- [ ] Build static sample Spec.
- [ ] Add server-only environment validation.

### Jev

- [ ] Connect `AI_GATEWAY_API_KEY`.
- [ ] Implement evaluation wrapper.
- [ ] Define atomic questions.
- [ ] Define candidate descriptions.
- [ ] Validate answers.
- [ ] Convert decisions into a json-render Spec.

### Diffusion

- [ ] Define `DiffusionProvider` interface.
- [ ] Implement Replicate provider.
- [ ] Implement FLUX Schnell request.
- [ ] Normalize output URLs.
- [ ] Add asset cache.
- [ ] Add retry limit.
- [ ] Add placeholder fallback.

### Composition

- [ ] Build asset planner.
- [ ] Connect component decisions to asset requirements.
- [ ] Generate assets only when needed.
- [ ] Inject URLs into Spec.
- [ ] Render final UI.

### Editing

- [ ] Store versions.
- [ ] Pass existing Spec into edit flow.
- [ ] Identify affected elements.
- [ ] Regenerate only affected assets.
- [ ] Preserve unchanged state.

### Evaluation

- [ ] Add structured asset evaluator.
- [ ] Add Jev evaluation questions.
- [ ] Add regeneration decision.
- [ ] Add generation budgets.
- [ ] Add telemetry.

### Benchmark

- [ ] Build baseline LLM-only pipeline.
- [ ] Build Jev-only pipeline.
- [ ] Build Jev + Diffusion pipeline.
- [ ] Measure latency.
- [ ] Measure cost.
- [ ] Measure quality.
- [ ] Measure generation count.
- [ ] Publish results.

### Launch

- [ ] Polish homepage.
- [ ] Add showcase prompts.
- [ ] Add technical inspector.
- [ ] Record demo video.
- [ ] Write README.
- [ ] Write architecture documentation.
- [ ] Publish benchmark results.
- [ ] Deploy public demo.
- [ ] Publish GitHub repository.

---

## 62. One-Sentence Definition

> **JevCanvas is a generative UI system where Jev makes typed structural decisions, diffusion creates the visual assets those decisions require, and json-render turns the resulting constrained specification into a live interactive interface.**

