import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAsset } from "@/lib/assets";
import { DIFFUSION_MODEL, MAX_GENERATIONS_PER_ASSET } from "@/lib/constants";
import { placeholderFor, ReplicateFluxProvider, type DiffusionProvider } from "@/lib/diffusion";
import { hasServerSecrets } from "@/lib/env";
import { AssetGenerateRequestSchema } from "@/lib/schemas";

const RegenerateSchema = AssetGenerateRequestSchema.extend({
  generationsUsed: z.number().int().min(0).default(1),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = RegenerateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid regenerate request." }, { status: 400 });
  // Budget: at most 1 regen (2 generations total) per asset.
  if (parsed.data.generationsUsed >= MAX_GENERATIONS_PER_ASSET)
    return NextResponse.json({ error: "Regeneration budget exhausted for this asset." }, { status: 429 });
  try {
    const provider: DiffusionProvider = hasServerSecrets()
      ? new ReplicateFluxProvider(process.env.REPLICATE_API_TOKEN ?? "")
      : { generate: async (r) => ({ url: placeholderFor("Illustration"), model: DIFFUSION_MODEL, seed: (r.seed ?? 0) + 1, width: 1024, height: 768 }) };
    const asset = await generateAsset({
      item: {
        id: parsed.data.assetId, type: "Illustration", required: true,
        purpose: parsed.data.prompt.slice(0, 200), style: "technical",
        aspectRatio: parsed.data.aspectRatio, seed: (parsed.data.seed ?? 0) + 1,
      },
      intent: parsed.data.prompt,
      provider,
    });
    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Asset regeneration failed." }, { status: 502 });
  }
}
