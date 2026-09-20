#!/usr/bin/env python3
"""Stdlib-only smoke checker. Run: python scripts/smoke.py (exit 0 = ok)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures: list[str] = []


def check(cond: bool, msg: str) -> None:
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


REQUIRED = [
    "package.json", "tsconfig.json", "next.config.mjs", "tailwind.config.ts",
    "postcss.config.mjs", "next-env.d.ts", "README.md", ".gitignore", ".env.example",
    "app/page.tsx", "app/layout.tsx", "app/globals.css", "app/projects/[id]/page.tsx",
    "app/api/generate/route.ts", "app/api/edit/route.ts", "app/api/evaluate/route.ts",
    "app/api/assets/generate/route.ts", "app/api/assets/regenerate/route.ts",
    "app/api/projects/route.ts",
    "components/prompt-input.tsx", "components/preview.tsx", "components/inspector.tsx",
    "components/version-history.tsx", "components/asset-panel.tsx", "components/metrics-panel.tsx",
    "components/catalog.tsx", "components/registry.tsx",
    "lib/env.ts", "lib/ids.ts", "lib/logging.ts", "lib/timing.ts", "lib/jev.ts",
    "lib/composition.ts", "lib/diffusion.ts", "lib/assets.ts", "lib/evaluation.ts",
    "lib/versions.ts", "lib/schemas.ts", "lib/benchmarks.ts", "lib/constants.ts",
    "tests/smoke.test.ts", "scripts/smoke.py",
    "public/placeholder-hero.svg", "public/placeholder-illustration.svg",
]

for rel in REQUIRED:
    check((ROOT / rel).exists(), f"exists: {rel}")

FORBIDDEN_DIRS = ["jev", "diffusion", "evaluation", "state", "render", "src",
                  "utils", "helpers", "services", "providers"]
for d in FORBIDDEN_DIRS:
    check(not (ROOT / d).is_dir(), f"no forbidden dir: {d}/")

gi = (ROOT / ".gitignore").read_text() if (ROOT / ".gitignore").exists() else ""
for token in ["json-render/", "node_modules/", ".next/", ".env", ".env.local"]:
    check(token in gi, f".gitignore contains {token}")

env_example = (ROOT / ".env.example").read_text() if (ROOT / ".env.example").exists() else ""
check("AI_GATEWAY_API_KEY" in env_example, ".env.example names AI_GATEWAY_API_KEY")
check("REPLICATE_API_TOKEN" in env_example, ".env.example names REPLICATE_API_TOKEN")
# No secret values: lines must be names with empty values.
bad_values = [ln for ln in env_example.splitlines()
              if ln.strip() and not ln.strip().startswith("#") and "=" in ln
              and ln.split("=", 1)[1].strip() not in ("", '""', "''")]
check(not bad_values, f".env.example has no secret values ({len(bad_values)} bad)")

try:
    pkg = json.loads((ROOT / "package.json").read_text())
    scripts = pkg.get("scripts", {})
    for s in ["dev", "build", "start", "lint", "typecheck", "test"]:
        check(s in scripts, f"package.json script: {s}")
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    check("@json-render/core" in deps, "depends on @json-render/core")
    check("@json-render/react" in deps, "depends on @json-render/react")
    check("zod" in deps, "depends on zod")
except Exception as exc:  # noqa: BLE001
    check(False, f"package.json parses ({exc})")

# No client file may import server secrets.
client_dirs = [ROOT / "components", ROOT / "app"]
leak = False
for base in client_dirs:
    for path in base.rglob("*.tsx"):
        text = path.read_text(errors="ignore")
        if "AI_GATEWAY_API_KEY" in text or "REPLICATE_API_TOKEN" in text or "from \"@/lib/env\"" in text or "from \"../lib/env\"" in text:
            print(f"FAIL secret import in {path.relative_to(ROOT)}")
            leak = True
check(not leak, "no client file imports server secrets")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
