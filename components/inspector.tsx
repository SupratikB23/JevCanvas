"use client";
import React from "react";
import type { JevDecisions } from "../lib/schemas";
import type { Telemetry } from "../lib/evaluation";

export function Inspector({
  decisions,
  telemetry,
  fromFallback,
}: {
  decisions: JevDecisions | null;
  telemetry: Telemetry | null;
  fromFallback: boolean;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-slate-700 p-3 text-xs">
        <div className="mb-1 font-semibold">Jev decisions {fromFallback && <span className="text-amber-300">(fallback)</span>}</div>
        <pre className="whitespace-pre-wrap text-slate-300">{decisions ? JSON.stringify(decisions, null, 1) : "—"}</pre>
      </div>
      <div className="rounded-lg border border-slate-700 p-3 text-xs">
        <div className="mb-1 font-semibold">Timing / cost</div>
        <pre className="whitespace-pre-wrap text-slate-300">{telemetry ? JSON.stringify(telemetry, null, 1) : "—"}</pre>
      </div>
    </div>
  );
}
