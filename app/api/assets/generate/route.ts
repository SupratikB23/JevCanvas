import { NextResponse } from "next/server";
import { generateAsset } from "@/lib/assets";
import { DIFFUSION_MODEL } from "@/lib/constants";
import { placeholderFor, ReplicateFluxProvider, type DiffusionProvider } from "@/lib/diffusion";
import { hasServerSecrets } from "@/lib/env";
import { AssetGenerateRequestSchema } from "@/lib/schemas";

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = AssetGenerateRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid asset request." }, { status: 400 });
  const { assetId, prompt, aspectRatio, seed } = parsed.data;
  try {
    const provider: DiffusionProvider = hasServerSecrets()
      ? new ReplicateFluxProvider(process.env.REPLICATE_API_TOKEN ?? "")
      : { generate: async (r) => ({ url: placeholderFor("Illustration"), model: DIFFUSION_MODEL, seed: r.seed, width: 1024, height: 768 }) };
    const asset = await generateAsset({
      item: { id: assetId, type: "Illustration", required: true, purpose: prompt.slice(0, 200), style: "technical", aspectRatio, seed },
      intent: prompt,
      provider,
    });
    return NextResponse.json({ assetId: asset.id, url: asset.url, provider: "replicate", model: asset.model ?? DIFFUSION_MODEL });
  } catch {
    return NextResponse.json({ error: "Asset generation failed." }, { status: 502 });
  }
}
