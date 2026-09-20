"use client";
import React from "react";
import type { Telemetry } from "../lib/evaluation";

export function MetricsPanel({ telemetry }: { telemetry: Telemetry | null }): React.JSX.Element {
  if (!telemetry) return <div className="text-xs text-slate-500">No metrics yet.</div>;
  const rows: [string, string][] = [
    ["Jev latency", `${Math.round(telemetry.jevLatencyMs)} ms`],
    ["Diffusion latency", `${Math.round(telemetry.diffusionLatencyMs)} ms`],
    ["Total latency", `${Math.round(telemetry.totalLatencyMs)} ms`],
    ["Jev calls", String(telemetry.jevCalls)],
    ["Diffusion calls", String(telemetry.diffusionCalls)],
    ["Cache hits", String(telemetry.cacheHits)],
    ["Est. cost", `$${telemetry.estCostUsd.toFixed(4)}`],
    ["Components", String(telemetry.componentCount)],
    ["Questions", String(telemetry.questionCount)],
    ["Assets", String(telemetry.assetCount)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-slate-700 p-2">
          <dt className="text-slate-400">{k}</dt>
          <dd className="font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
