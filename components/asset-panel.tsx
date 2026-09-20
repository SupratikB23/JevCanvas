"use client";
import React from "react";
import type { AssetState } from "../lib/schemas";

export function AssetPanel({
  assets,
  onRegenerate,
}: {
  assets: AssetState[];
  onRegenerate: (assetId: string) => void;
}): React.JSX.Element {
  if (assets.length === 0) return <div className="text-xs text-slate-500">No assets.</div>;
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {assets.map((a) => (
        <div key={a.id} className="rounded-lg border border-slate-700 p-2 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">{a.id}</span>
            <span className="text-slate-400">{a.status} · {a.source ?? "—"}</span>
          </div>
          {a.url && (a.url.startsWith("http") || a.url.startsWith("data:image/svg+xml")) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.id} className="h-24 w-full rounded object-cover" loading="lazy" />
          ) : (
            <div className="flex h-24 items-center justify-center rounded bg-slate-800 text-slate-500">missing asset</div>
          )}
          <button className="mt-2 rounded border border-slate-600 px-2 py-0.5" onClick={() => onRegenerate(a.id)}>
            Regenerate
          </button>
        </div>
      ))}
    </div>
  );
}
