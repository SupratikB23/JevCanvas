"use client";
// Local renderer: maps every catalog type to a small Tailwind component.
// Graceful fallbacks for missing/slow/failed assets. No dangerouslySetInnerHTML.
// This intentionally avoids importing @json-render/react at module scope so the
// page builds even when json-render is absent; see lib/composition.ts
// validateWithJsonRender() for the optional validator bridge.
import React from "react";
import type { Spec } from "../lib/schemas";

function MissingAsset({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-800/60 text-sm text-slate-400">
      {label} unavailable — showing fallback
    </div>
  );
}

function AssetImage({ url, alt }: { url?: string; alt: string }): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);
  if (!url || failed) return <MissingAsset label={alt} />;
  // SVG data-URI placeholders and https URLs only. Plain http is rejected to
  // avoid mixed-content blocks on HTTPS deploys.
  if (!(url.startsWith("https://") || url.startsWith("data:image/svg+xml"))) {
    return <MissingAsset label={alt} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="h-auto w-full rounded-lg object-cover" loading="lazy" onError={() => setFailed(true)} />
  );
}

function renderElement(
  spec: Spec,
  key: string,
  onAction: (action: string, params?: Record<string, unknown>) => void,
): React.ReactNode {
  const el = spec.elements[key];
  if (!el) return null;
  const props = (el.props ?? {}) as Record<string, unknown>;
  const children = (el.children ?? []).map((c) => (
    <React.Fragment key={c}>{renderElement(spec, c, onAction)}</React.Fragment>
  ));
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

  switch (el.type) {
    case "PageShell":
      return (
        <div className="min-h-[320px] rounded-xl bg-slate-900 text-slate-100">
          <div className="border-b border-slate-700 px-5 py-3 text-sm font-semibold">{str(props.title, "Page")}</div>
          <div className="flex">
            {props.sidebar === true && (
              <aside className="w-40 border-r border-slate-700 p-4 text-xs text-slate-400">Sidebar</aside>
            )}
            <div className="flex-1 space-y-4 p-5">{children}</div>
          </div>
        </div>
      );
    case "Section":
      return (
        <section className="space-y-3">
          {str(props.title) && <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{str(props.title)}</h3>}
          <div className="space-y-3">{children}</div>
        </section>
      );
    case "Hero": {
      const assetUrl = str(props.assetUrl);
      const bg = str(props.backgroundAssetId);
      const url = assetUrl || (bg.startsWith("https://") ? bg : "");
      return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-8">
          {url ? <AssetImage url={url} alt="Hero background" /> : null}
          <h2 className="mt-3 text-2xl font-bold">{str(props.title, "Untitled")}</h2>
          {str(props.subtitle) && <p className="mt-1 text-sm text-slate-300">{str(props.subtitle)}</p>}
        </div>
      );
    }
    case "Heading":
      return <h2 className="text-xl font-bold">{str(props.text)}</h2>;
    case "Paragraph":
      return <p className="text-sm leading-6 text-slate-300">{str(props.text)}</p>;
    case "MetricCard": {
      const items = Array.isArray(props.items) ? (props.items as { label: string; value: string }[]) : [];
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((m, i) => (
            <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <div className="text-xs text-slate-400">{m.label}</div>
              <div className="text-lg font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      );
    }
    case "Card":
      return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          {str(props.title) && <div className="mb-2 font-semibold">{str(props.title)}</div>}
          {children}
        </div>
      );
    case "Button": {
      const variant = str(props.variant, "primary");
      const variantClass: Record<string, string> = {
        primary: "bg-indigo-500 hover:bg-indigo-400",
        secondary: "border border-slate-500 bg-transparent hover:bg-slate-700",
        ghost: "bg-transparent hover:bg-slate-700",
      };
      return (
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium ${variantClass[variant] ?? variantClass.primary}`}
          onClick={() => onAction("noop", { label: str(props.label) })}
        >
          {str(props.label, "Action")}
        </button>
      );
    }
    case "Badge": {
      const tone = str(props.tone, "neutral");
      const toneClass: Record<string, string> = {
        neutral: "bg-slate-700",
        success: "bg-emerald-700",
        warning: "bg-amber-700",
        info: "bg-sky-700",
      };
      return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${toneClass[tone] ?? toneClass.neutral}`}>{str(props.text)}</span>
      );
    }
    case "Tabs": {
      const tabs = Array.isArray(props.tabs) ? (props.tabs as string[]) : [];
      const active = str(props.active);
      return (
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              aria-pressed={t === active}
              className={`rounded-md border px-3 py-1 text-xs ${t === active ? "border-indigo-400 bg-indigo-500/30" : "border-slate-600"}`}
              onClick={() => onAction("selectTab", { tab: t })}
            >
              {t}
            </button>
          ))}
        </div>
      );
    }
    case "Chart": {
      const series = Array.isArray(props.series) ? (props.series as number[]) : [40, 65, 30, 80, 55];
      return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="mb-2 text-sm font-semibold">{str(props.title, "Chart")}</div>
          <div className="flex h-24 items-end gap-1">
            {series.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm bg-indigo-400/80" style={{ height: `${Math.max(4, Math.min(100, v))}%` }} />
            ))}
          </div>
        </div>
      );
    }
    case "Table": {
      const cols = Array.isArray(props.columns) ? (props.columns as string[]) : [];
      const rows = Array.isArray(props.rows) ? (props.rows as string[][]) : [];
      return (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-400">{cols.map((c) => (<th key={c} className="border-b border-slate-700 py-1 pr-3">{c}</th>))}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{r.map((cell, j) => (<td key={j} className="border-b border-slate-800 py-1 pr-3">{cell}</td>))}</tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "Timeline": {
      const items = Array.isArray(props.items) ? (props.items as { title: string; detail?: string }[]) : [];
      return (
        <ol className="space-y-2 border-l border-slate-700 pl-4">
          {items.map((it, i) => (
            <li key={i}>
              <div className="text-sm font-medium">{it.title}</div>
              {it.detail && <div className="text-xs text-slate-400">{it.detail}</div>}
            </li>
          ))}
        </ol>
      );
    }
    case "Image":
      return <AssetImage url={str(props.assetUrl) || str(props.src) || undefined} alt={str(props.alt, "Generated image")} />;
    case "Grid": {
      // Static class map (not template interpolation) so Tailwind's content
      // scanner keeps every variant. Falls back to 2 columns on bad input.
      const cols = typeof props.columns === "number" ? props.columns : 2;
      const colClass: Record<number, string> = {
        1: "md:grid-cols-1",
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4",
      };
      return <div className={`grid grid-cols-1 gap-3 ${colClass[cols] ?? "md:grid-cols-2"}`}>{children}</div>;
    }
    case "Stack": {
      const gap = str(props.gap, "md");
      const gapClass: Record<string, string> = { sm: "gap-2", md: "gap-3", lg: "gap-5" };
      return <div className={`flex flex-col ${gapClass[gap] ?? "gap-3"}`}>{children}</div>;
    }
    case "Divider":
      return <hr className="border-slate-700" />;
    default:
      return (
        <div className="rounded-md border border-amber-600 bg-amber-950 p-2 text-xs text-amber-300">
          Unknown component rejected: {el.type}
        </div>
      );
  }
}

export function RegistryRenderer({
  spec,
  onAction,
}: {
  spec: Spec;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}): React.JSX.Element {
  const handle = onAction ?? ((): void => {});
  const root = spec.elements[spec.root];
  if (!root) return <MissingAsset label="Empty spec" />;
  return <div className="space-y-4">{renderElement(spec, spec.root, handle)}</div>;
}
