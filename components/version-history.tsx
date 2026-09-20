"use client";
import React from "react";
import type { Version } from "../lib/schemas";

export function VersionHistory({
  versions,
  activeId,
  onSelect,
}: {
  versions: Version[];
  activeId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  if (versions.length === 0) return <div className="text-xs text-slate-500">No versions yet.</div>;
  return (
    <ol className="flex flex-wrap gap-2">
      {versions.map((v, i) => (
        <li key={v.id}>
          <button
            className={`rounded-md border px-2 py-1 text-xs ${v.id === activeId ? "border-indigo-400 bg-indigo-950" : "border-slate-700"}`}
            onClick={() => onSelect(v.id)}
          >
            V{i + 1} · {v.prompt.slice(0, 28)}
          </button>
        </li>
      ))}
    </ol>
  );
}
