# AGENTS.md

## Purpose

This file defines the mandatory rules for every AI coding agent working in this repository.

The project is **JevCanvas**, a generative-interface system combining:

- **Jev / TypeSafe** for structured decisions and UI composition choices.
- **Diffusion models** for generated visual assets.
- **json-render** for constrained, predictable UI rendering.
- **Next.js / TypeScript** for the application layer.

Every agent must preserve this architecture, keep the repository small and understandable, and avoid autonomous actions that affect remote Git repositories.

---

# 1. NON-NEGOTIABLE GIT RULES

## Never push code automatically

**NEVER run `git push` on your own.**

This includes:

- `git push`
- `git push --force`
- `git push --set-upstream ...`
- GitHub CLI commands that create or update remote branches
- Any command that publishes code to a remote repository
- Any automated GitHub/GitLab/Bitbucket action that commits or pushes code

A user must explicitly instruct the agent to perform a remote push in the current conversation.

Even when a task says “finish the feature”, “ship it”, “publish it”, or “update GitHub”, **do not interpret this as permission to push** unless the user explicitly asks for a push.

## Never create AI-authored remote contributions automatically

Do not create commits and push them as an autonomous step.

Local commits are allowed only when the user explicitly requests a commit. Otherwise, leave changes in the working tree and report them.

Do not:

- open pull requests automatically
- merge pull requests automatically
- create releases automatically
- create GitHub issues automatically
- modify repository settings automatically
- add collaborators automatically
- add yourself, an AI identity, a bot identity, or an agent identity as a contributor

## Safe Git operations

These are normally allowed:

```bash
git status
git diff
git diff --check
git log
git branch --show-current
git show
```

Read-only remote inspection is allowed when necessary.

Before any Git operation that changes repository history or remote state, stop and require explicit user instruction.

## Before finishing a task

Always report:

1. Which files were changed.
2. What was implemented.
3. What checks were run.
4. Whether anything remains uncommitted.
5. Clearly state that no remote push was performed unless the user explicitly requested one.

---

# 2. NEVER DESTROY USER WORK

Do not delete, overwrite, reset, revert, or mass-rewrite user work unless explicitly required by the task.

Never use destructive commands such as:

```bash
git reset --hard
git clean -fd
git checkout -- .
rm -rf ...
```

unless the user explicitly authorizes the specific destructive operation.

Before changing an existing implementation, inspect it first.

Prefer small patches over large rewrites.

If an existing solution works, improve it instead of replacing it unnecessarily.

---

# 3. REPOSITORY STRUCTURE

## Keep the repository intentionally small

Do **not** create a new directory merely because a file belongs to a conceptual category.

Prefer a shallow structure.

Recommended structure:

```text
jevcanvas/
├── app/                    # Next.js routes and pages
├── components/             # UI components + json-render catalog/registry
├── lib/                    # Jev, diffusion, composition, schemas, utilities
├── public/                 # Static assets only
├── tests/                  # Automated tests
├── scripts/                # Small developer/benchmark scripts only
├── .env.example
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
└── ...config files
```

### Folder rules

- Do not create `src/` unless the project already uses it.
- Do not create `utils/`, `helpers/`, `services/`, `providers/`, `managers/`, `handlers/`, `engine/`, `core/`, `shared/`, `common/`, `types/`, or similar catch-all folders unless there is a demonstrated need and the user approves the structural change.
- Prefer a small number of well-named files inside `lib/` over many tiny directories.
- Do not nest directories more than necessary.
- Avoid folders containing only one file.
- Avoid files containing only trivial re-exports.
- Avoid duplicate implementations of the same service.

### Do not create folder sprawl

Before creating a new folder, ask:

> Can this file live in an existing directory without making that directory confusing?

If yes, use the existing directory.

### Generated files

Do not commit generated artifacts, caches, model weights, local outputs, or temporary files unless they are deliberately part of the product.

Keep these out of the repository when possible:

```text
node_modules/
.next/
dist/
build/
coverage/
*.log
.env
.env.local
*.ckpt
*.safetensors
*.bin
cache/
tmp/
outputs/
```

Use `.gitignore` appropriately.

---

# 4. ARCHITECTURE RULES

The project has three primary responsibilities.

```text
USER REQUEST
     │
     ▼
   JEV
     │
     ├── structural decisions
     ├── component selection
     ├── layout decisions
     └── semantic evaluation
     │
     ▼
 JSON SPEC
     │
     ├───────────────┐
     ▼               ▼
DIFFUSION       COMPONENT DATA
assets              │
     └───────┬──────┘
             ▼
        JSON-RENDER
             │
             ▼
          LIVE UI
```

Agents must preserve this separation.

## JEV

Jev is the structured decision layer.

Use Jev for:

- component selection
- composition decisions
- discrete routing
- structured evaluation
- confidence-aware branching
- deciding which visual asset is needed

Do not use Jev as a free-form text generator.

## Diffusion

Diffusion is the visual-generation layer.

Use it for:

- backgrounds
- illustrations
- decorative visuals
- textures
- generated visual identity
- other explicitly visual assets

Do not make diffusion responsible for UI structure when json-render can represent that structure directly.

## json-render

json-render is the rendering and capability boundary.

Use it for:

- validated UI specifications
- component rendering
- state binding
- controlled actions
- predictable presentation

Do not bypass the component catalog with arbitrary generated React/HTML when a catalog component can represent the feature.

---

# 5. JEV SAFETY AND USAGE RULES

Always use the current supported evaluation interface documented by Vercel/TypeSafe.

Primary model ID:

```text
typesafe-ai/jev
```

When using Vercel AI Gateway, keep credentials server-side.

Never expose:

- `AI_GATEWAY_API_KEY`
- TypeSafe API keys
- provider credentials
- tokens
- private endpoints
- secret environment variables

Never place secrets in:

- source files
- React client code
- JSON specs
- test fixtures
- screenshots
- README examples
- commits

Use `.env.local` or the deployment secret store.

Only expose variable names in `.env.example`.

---

# 6. DIFFUSION ASSET RULES

Generated assets must be treated as data, not as arbitrary code.

Prefer this flow:

```text
Jev decision
    ↓
asset request
    ↓
diffusion provider
    ↓
validated asset URL / storage key
    ↓
json-render spec
```

Do not embed enormous base64 images in JSON specs.

Do not store large model weights in Git.

Use remote/object storage or a local ignored directory for development assets.

Generated assets must have predictable metadata where practical:

```text
assetId
prompt
model
size
createdAt
source
```

Avoid generating duplicate assets when an existing asset satisfies the same request.

---

# 7. JSON-RENDER RULES

The generated UI must stay within an explicit catalog.

Prefer:

```text
prompt
→ Jev
→ candidates
→ validated Spec
→ renderer
```

over:

```text
prompt
→ arbitrary generated JSX
```

Keep component definitions reusable.

Do not create a new component for every visual variation.

Use props, catalog candidates, state bindings, and existing renderer capabilities first.

Every new component must have a clear reason to exist.

Actions must be validated and authorized in application code. A component being present in a generated spec does not automatically make an action safe.

---

# 8. API AND NETWORK RULES

Use server-side API routes for provider calls whenever secrets are involved.

Do not call provider APIs directly from browser/client code when the request requires a secret key.

Implement reasonable:

- request timeouts
- error handling
- retry limits
- response validation
- input limits
- logging without secrets

Never create infinite retry loops.

Never silently swallow provider failures.

Return useful errors to the application while keeping secrets and sensitive request data out of logs.

---

# 9. DEPENDENCY RULES

Do not add dependencies casually.

Before adding a package:

1. Check whether the functionality already exists in the project.
2. Check whether an existing dependency already provides it.
3. Prefer the smallest maintained dependency when a new dependency is necessary.
4. Avoid adding large frameworks for small utilities.

Do not change package managers without explicit instruction.

Do not rewrite lockfiles manually.

Do not upgrade the entire dependency tree merely to fix an unrelated issue.

---

# 10. CODE QUALITY

Write production-oriented code, not disposable demo code.

Prefer:

- TypeScript types
- small functions
- explicit interfaces
- predictable error paths
- descriptive names
- comments only where reasoning is non-obvious

Avoid:

- giant files
- giant functions
- duplicated logic
- magic constants scattered throughout the project
- deeply nested conditionals
- `any` when a useful type is available
- dead code
- commented-out old implementations

Keep public APIs small.

---

# 11. VALIDATION BEFORE HANDOFF

Every meaningful implementation change must be validated.

At minimum, use the project's available checks such as:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Only run commands that exist in `package.json` or project documentation.

For UI changes, also verify the relevant page/build manually when practical.

For Jev integration changes, validate:

- valid request shape
- correct model ID
- correct question types
- response parsing
- failure handling
- no client-side secret exposure

For diffusion integration changes, validate:

- provider call
- asset response
- asset URL/storage handling
- invalid-response handling
- rendering of the resulting asset

For json-render changes, validate:

- catalog schema
- generated spec validity
- component lookup
- state bindings
- action behavior

Never claim a test passed unless it was actually run.

---

# 12. TESTING PRINCIPLES

Tests should focus on behavior and contracts.

High-value tests include:

```text
Jev request → valid typed response
Jev failure → safe application behavior
diffusion request → asset reference
diffusion failure → graceful fallback
composition → valid json-render Spec
unknown component → rejected
invalid action → rejected
missing asset → fallback UI
```

Do not require live provider calls for every unit test.

Mock provider boundaries and keep a small number of explicit integration tests for real APIs.

Never put production API keys into test code.

---

# 13. UI/UX RULES

The generated interface must remain usable even when AI output is imperfect.

Always provide deterministic fallbacks for:

- missing visual assets
- slow generation
- failed generation
- unavailable provider
- incomplete composition

Do not make the entire application unusable because one generated asset failed.

Show meaningful loading and partial states.

Do not expose raw provider errors to end users.

---

# 14. PERFORMANCE AND COST

The project exists partly to investigate whether structured decisions plus targeted generation can reduce unnecessary generative inference.

Agents must avoid needless model calls.

Prefer:

```text
one Jev request with multiple independent questions
```

over:

```text
one Jev request per question
```

Reuse generated assets where appropriate.

Do not regenerate an asset merely because a component rerendered.

Avoid putting generation calls inside React render functions.

Generation should be event-driven, server-side, cached, or otherwise controlled.

Track useful metrics where practical:

- Jev latency
- diffusion latency
- total generation latency
- number of Jev calls
- number of diffusion calls
- cache hit rate
- estimated generation cost
- composition completion rate
- failed generations

---

# 15. LOGGING AND OBSERVABILITY

Logs should help debug the workflow without exposing secrets.

Good log information:

```text
requestId
stage
model name
latency
status
assetId
component count
question count
```

Do not log:

- API keys
- authorization headers
- full private user data
- cookies
- session tokens
- secrets

Avoid dumping huge model responses into logs.

---

# 16. CHANGE MANAGEMENT

For every task:

1. Inspect the existing implementation.
2. Identify the smallest appropriate change.
3. Implement it.
4. Run relevant validation.
5. Inspect the resulting diff.
6. Report the result.

Do not refactor unrelated files during a feature task.

Do not rename large portions of the repository unless required.

Do not create architectural abstractions before they are needed.

---

# 17. WHEN REQUIREMENTS ARE AMBIGUOUS

Prefer the safest interpretation that preserves existing behavior.

Do not make irreversible architectural decisions because of an ambiguous request.

Do not ask the user unnecessary questions when a safe implementation choice is obvious.

When a decision materially changes architecture, dependency count, security, data storage, or repository structure, stop and surface the decision before proceeding.

---

# 18. AUTONOMOUS ACTION BOUNDARIES

Agents are expected to be proactive inside the repository, but must remain conservative at system boundaries.

### Allowed without additional permission

- inspect files
- edit source code
- add tests
- run local tests
- run local builds
- inspect Git status/diff
- create small local scripts
- use development API calls when credentials are already configured and the task requires them

### Not allowed without explicit user instruction

- `git push`
- force push
- merging branches
- opening PRs
- publishing releases
- changing repository visibility
- adding collaborators
- changing GitHub settings
- deleting remote resources
- deploying production
- rotating or exposing credentials
- destructive local cleanup

---

# 19. DEFINITION OF DONE

A task is complete when:

- the requested behavior exists
- the implementation fits the existing architecture
- the repository structure remains clean
- no unnecessary folders were introduced
- secrets are protected
- relevant tests/checks pass
- the final diff has been inspected
- no unrelated changes were introduced
- no remote code was pushed unless explicitly requested

---

# 20. FINAL AGENT RULE

**When in doubt, preserve user control.**

Do the useful work locally, keep the implementation clean, validate it, and stop before any remote or destructive action.

The repository should remain understandable to a human opening it for the first time.
