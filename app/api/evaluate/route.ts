import { NextResponse } from "next/server";
import { decideAssetFit, extractVisionFeaturesStub } from "@/lib/evaluation";
import { newRequestId } from "@/lib/ids";
import { EvaluateRequestSchema } from "@/lib/schemas";
import { getVersion } from "@/lib/versions";

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = newRequestId();
  void requestId;
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid evaluate request." }, { status: 400 });

  const { assetId, versionId, features } = parsed.data;
  let style = "technical";
  let generationsUsed = 1;
  if (versionId) {
    const v = getVersion(versionId);
    if (!v) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    style = v.decisions?.visualStyle ?? style;
    if (assetId) {
      const asset = v.assets.find((a) => a.id === assetId);
      if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
      const vision = extractVisionFeaturesStub(asset, style);
      return NextResponse.json(decideAssetFit({ assetId, features: vision, generationsUsed }));
    }
  }
  // Direct feature evaluation (vision adapter output supplied by caller).
  const vision = {
    hasText: features?.hasText === true,
    dark: features?.dark === true,
    negativeSpace: features?.negativeSpace !== false,
    matchesStyle: features?.matchesStyle !== false,
  };
  return NextResponse.json(
    decideAssetFit({ assetId: assetId ?? "asset", features: vision, generationsUsed }),
  );
}
