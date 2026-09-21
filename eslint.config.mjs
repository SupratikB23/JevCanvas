// Flat config bridging next/core-web-vitals via FlatCompat.
// Run with `npm run lint`. Builds still skip lint (next.config.mjs).
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: ["node_modules/**", ".next/**", "json-render/**", "next-env.d.ts"],
  },
  {
    // FlatCompat spread trips import/no-anonymous-default-export on this file only.
    files: ["eslint.config.mjs"],
    rules: { "import/no-anonymous-default-export": "off" },
  },
];
