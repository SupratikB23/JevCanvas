// Version store: in-memory server map + browser-session helpers.
// Targeted edits regenerate only affected assets; unchanged are preserved.
import { newVersionId } from "./ids";
import type { Version } from "./schemas";

const store = new Map<string, Version>();

export function saveVersion(v: Omit<Version, "id" | "createdAt"> & { id?: string }): Version {
  const full: Version = {
    ...v,
    id: v.id ?? newVersionId(),
    createdAt: new Date().toISOString(),
  };
  store.set(full.id, full);
  return full;
}

export function getVersion(id: string): Version | undefined {
  return store.get(id);
}

export function listVersions(): Version[] {
  return [...store.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function clearVersionsForTests(): void {
  store.clear();
}

// Browser session persistence (client only; guarded for SSR).
const SESSION_KEY = "jevcanvas:versions";

export function loadSessionVersions(): Version[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Version[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSessionVersions(versions: Version[]): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(versions.slice(-20)));
  } catch {
    // Storage full or unavailable: session history is best-effort.
  }
}
