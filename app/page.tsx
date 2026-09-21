"use client";
import React from "react";
import { AssetPanel } from "../components/asset-panel";
import { Inspector } from "../components/inspector";
import { MetricsPanel } from "../components/metrics-panel";
import { Preview } from "../components/preview";
import { PromptInput } from "../components/prompt-input";
import { VersionHistory } from "../components/version-history";
import type { Telemetry } from "../lib/evaluation";
import type { AssetState, JevDecisions, Spec, Version } from "../lib/schemas";
import { loadSessionVersions, persistSessionVersions } from "../lib/versions";

interface GeneratePayload {
  versionId: string;
  spec: Spec;
  assets: AssetState[];
  decisions: JevDecisions;
  timing: Telemetry & { fromFallback: boolean };
}

export default function HomePage(): React.JSX.Element {
  const [spec, setSpec] = React.useState<Spec | null>(null);
  const [assets, setAssets] = React.useState<AssetState[]>([]);
  const [decisions, setDecisions] = React.useState<JevDecisions | null>(null);
  const [telemetry, setTelemetry] = React.useState<Telemetry | null>(null);
  const [fromFallback, setFromFallback] = React.useState(false);
  const [versions, setVersions] = React.useState<Version[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [stage, setStage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [editPrompt, setEditPrompt] = React.useState("");

  // Load once on mount; only persist after the initial load so first paint
  // never overwrites a stored session with the empty default.
  const sessionLoaded = React.useRef(false);
  React.useEffect(() => {
    setVersions(loadSessionVersions());
    sessionLoaded.current = true;
  }, []);
  React.useEffect(() => {
    if (sessionLoaded.current) persistSessionVersions(versions);
  }, [versions]);

  function applyPayload(p: GeneratePayload, prompt: string): void {
    setSpec(p.spec);
    setAssets(p.assets);
    setDecisions(p.decisions);
    setTelemetry(p.timing);
    setFromFallback(p.timing.fromFallback);
    const v: Version = {
      id: p.versionId,
      prompt,
      spec: p.spec,
      assets: p.assets,
      decisions: p.decisions,
      createdAt: new Date().toISOString(),
    };
    setVersions((prev) => [...prev.slice(-19), v]);
    setActiveId(p.versionId);
  }

  async function handleGenerate(prompt: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setStage("Jev is deciding structure…");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`Generation failed (HTTP ${res.status}).`);
      setStage("Diffusion assets streaming in…");
      const payload = (await res.json()) as GeneratePayload;
      applyPayload(payload, prompt);
      setStage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(): Promise<void> {
    if (!activeId || !editPrompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: activeId, prompt: editPrompt.trim() }),
      });
      if (!res.ok) throw new Error(`Edit failed (HTTP ${res.status}).`);
      const payload = (await res.json()) as GeneratePayload;
      applyPayload(payload, editPrompt.trim());
      setEditPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate(assetId: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/assets/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, prompt: "Regenerate with same intent", aspectRatio: "16:9", generationsUsed: 1 }),
      });
      if (!res.ok) throw new Error(`Regenerate failed (HTTP ${res.status}).`);
      const updated = (await res.json()) as AssetState;
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleSelectVersion(id: string): void {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    setActiveId(id);
    setSpec(v.spec);
    setAssets(v.assets);
    setDecisions(v.decisions ?? null);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">JevCanvas <span className="text-sm font-normal text-slate-400">Decide. Generate. Render.</span></h1>
        <span className="text-xs text-slate-400">Jev → Diffusion → json-render</span>
      </header>

      <PromptInput onGenerate={handleGenerate} busy={busy} />
      {stage && <div className="text-xs text-indigo-300" role="status">{stage}</div>}

      <Preview spec={spec} loading={busy} error={error} />

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="Follow-up edit, e.g. make the hero more minimal…"
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          aria-label="Edit prompt"
        />
        <button className="rounded-md border border-slate-600 px-3 py-2 text-sm disabled:opacity-50" disabled={busy || !activeId || !editPrompt.trim()} onClick={handleEdit}>
          Apply edit
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Live generated UI + assets</h2>
        <AssetPanel assets={assets} onRegenerate={handleRegenerate} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Inspector — Jev decisions | Assets | Timing | Cost | Versions</h2>
        <Inspector decisions={decisions} telemetry={telemetry} fromFallback={fromFallback} />
        <MetricsPanel telemetry={telemetry} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Version history</h2>
        <VersionHistory versions={versions} activeId={activeId} onSelect={handleSelectVersion} />
      </section>
    </main>
  );
}
