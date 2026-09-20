import { describe, expect, it } from "vitest";
import { fallbackSpec } from "../lib/composition";
import { clearVersionsForTests, getVersion, listVersions, saveVersion } from "../lib/versions";

describe("versions", () => {
  it("saves, gets, and lists; edits preserve unchanged assets", () => {
    clearVersionsForTests();
    const v1 = saveVersion({ prompt: "dashboard", spec: fallbackSpec("dashboard"), assets: [] });
    expect(getVersion(v1.id)?.prompt).toBe("dashboard");
    expect(listVersions().length).toBe(1);
    // Targeted-edit invariant: unchanged asset objects are reused by id.
    const kept = { id: "hero-bg", type: "HeroBackground", status: "ready", url: "https://cdn.example/keep.webp" } as const;
    const v2 = saveVersion({ prompt: "dashboard + darker", spec: fallbackSpec("dashboard"), assets: [{ ...kept }] });
    expect(v2.assets[0].url).toBe("https://cdn.example/keep.webp");
  });
});
