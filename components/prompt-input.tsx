"use client";
import React from "react";
import { MAX_PROMPT_CHARS } from "../lib/constants";

export const DEMO_PROMPTS = [
  "Create a futuristic AI research dashboard with metrics, a timeline, and a paper table.",
  "Create a technical portfolio for a machine learning researcher with publications, projects, and a dark editorial style.",
  "Create a premium landing page for an autonomous driving platform with a technical visual style.",
  "Create a futuristic music production workspace with a large visualizer, controls, and track panels.",
  "Create a CARLA autonomous driving dashboard showing vehicle status, risk, telemetry, and route information.",
];

export function PromptInput({
  onGenerate,
  busy,
}: {
  onGenerate: (prompt: string) => void;
  busy: boolean;
}): React.JSX.Element {
  const [value, setValue] = React.useState(DEMO_PROMPTS[0]);
  return (
    <div className="space-y-2">
      <textarea
        className="h-24 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm"
        value={value}
        maxLength={MAX_PROMPT_CHARS}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Interface description"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={busy || value.trim().length === 0}
          onClick={() => onGenerate(value.trim())}
        >
          {busy ? "Generating…" : "Generate"}
        </button>
        {DEMO_PROMPTS.map((p, i) => (
          <button key={i} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300" onClick={() => setValue(p)}>
            Demo {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
