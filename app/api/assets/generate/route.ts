import { NextResponse } from "next/server";
import { generateAsset } from "@/lib/assets";
import { DIFFUSION_MODEL } from "@/lib/constants";
import { selectDiffusionProvider } from "@/lib/diffusion";
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
    const provider = selectDiffusionProvider();
    const asset = await generateAsset({
      item: { id: assetId, type: "Illustration", required: true, purpose: prompt.slice(0, 200), style: "technical", aspectRatio, seed },
      intent: prompt,
      provider,
    });
    return NextResponse.json({ assetId: asset.id, url: asset.url, provider: asset.model === DIFFUSION_MODEL ? "replicate" : "free", model: asset.model ?? DIFFUSION_MODEL });
  } catch {
    return NextResponse.json({ error: "Asset generation failed." }, { status: 502 });
  }
}
