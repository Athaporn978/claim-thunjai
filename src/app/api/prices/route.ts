import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BRANDS } from "@/lib/carCatalog";
import { resolveLaborBrand, resolveLaborModel } from "@/lib/laborPriceAlias";

export const runtime = "nodejs";

type Tiers = { minor: number | null; moderate: number | null; severe: number | null; replace: number | null };

// Returns priced parts for a carCatalog brand+model, sourced from LaborPrice (the
// real per-brand/per-model data imported from the 21-sheet labor-code Excel — see
// scripts/import-labor-prices.ts). carCatalog and LaborPrice were built independently
// and often name brands/models differently, so src/lib/laborPriceAlias.ts bridges them.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || "";
  const modelId = searchParams.get("modelId") || "";

  const brand = BRANDS.find((b) => b.id === brandId);
  const model = brand?.models.find((m) => m.id === modelId);
  if (!brand || !model) {
    return NextResponse.json({ brandId, modelId, count: 0, prices: {} });
  }

  const laborBrand = resolveLaborBrand(brand.id, model.id);
  if (!laborBrand) {
    // Brand not covered by LaborPrice yet (e.g. Toyota, Honda) — not an error.
    return NextResponse.json({ brandId, modelId, laborBrand: null, laborModel: null, count: 0, prices: {} });
  }

  const distinctModels = await prisma.laborPrice.findMany({
    where: { brand: laborBrand },
    distinct: ["model"],
    select: { model: true },
  });
  const laborModel = resolveLaborModel(brand.id, model.id, model.name, laborBrand, distinctModels.map((d) => d.model));
  if (!laborModel) {
    return NextResponse.json({ brandId, modelId, laborBrand, laborModel: null, count: 0, prices: {} });
  }

  const rows = await prisma.laborPrice.findMany({
    where: { brand: laborBrand, model: laborModel },
    orderBy: { partTh: "asc" },
  });

  const hasVal = (t: Tiers) => t.minor != null || t.moderate != null || t.severe != null || t.replace != null;

  // A part can have multiple rows (e.g. separate L/R rows) — keep the first one
  // with any usable value per partTh.
  const map: Record<string, Tiers> = {};
  for (const p of rows) {
    const tiers: Tiers = { minor: p.minor, moderate: p.moderate, severe: p.severe, replace: p.replace };
    if (!hasVal(tiers)) continue;
    if (!map[p.partTh]) map[p.partTh] = tiers;
  }

  return NextResponse.json({ brandId, modelId, laborBrand, laborModel, count: Object.keys(map).length, prices: map });
}
