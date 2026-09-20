"use client";
import React from "react";
import type { Spec } from "../lib/schemas";
import { RegistryRenderer } from "./registry";

export function Preview({
  spec,
  loading,
  error,
}: {
  spec: Spec | null;
  loading: boolean;
  error: string | null;
}): React.JSX.Element {
  if (loading && !spec)
    return <div className="rounded-xl border border-slate-700 p-8 text-sm text-slate-400">Composing structure… assets stream in progressively.</div>;
  if (error && !spec)
    return <div className="rounded-xl border border-red-800 bg-red-950/40 p-8 text-sm text-red-300">{error}</div>;
  if (!spec) return <div className="rounded-xl border border-slate-700 p-8 text-sm text-slate-500">Describe an interface above to begin.</div>;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      {error && <div className="mb-3 rounded-md bg-red-950/50 p-2 text-xs text-red-300">{error}</div>}
      <RegistryRenderer spec={spec} />
    </div>
  );
}
