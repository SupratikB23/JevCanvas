import { NextResponse } from "next/server";
import { listVersions } from "@/lib/versions";

export async function GET(): Promise<NextResponse> {
  // In-memory MVP store. Summaries only; full specs come from generate/edit.
  const versions = listVersions().map((v) => ({
    id: v.id,
    prompt: v.prompt,
    createdAt: v.createdAt,
    componentCount: Object.keys(v.spec.elements).length,
    assetCount: v.assets.length,
  }));
  return NextResponse.json({ versions });
}
