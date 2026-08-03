import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand") || undefined;
    const model = searchParams.get("model") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: any = {};
    if (brand && brand !== "all") where.brand = brand;
    if (model && model !== "all") where.model = model;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { partTh: { contains: q } },
        { partEn: { contains: q } },
        { brand: { contains: q } },
        { model: { contains: q } },
      ];
    }

    const items = await prisma.partCatalogPrice.findMany({
      where,
      orderBy: [{ brand: "asc" }, { model: "asc" }, { partTh: "asc" }],
    });

    // Get unique list of brands and models for filters
    const allRecords = await prisma.partCatalogPrice.findMany({
      select: { brand: true, model: true },
    });

    const brands = Array.from(new Set(allRecords.map((r) => r.brand))).sort();
    const modelsByBrand: Record<string, string[]> = {};

    allRecords.forEach((r) => {
      if (!modelsByBrand[r.brand]) modelsByBrand[r.brand] = [];
      if (!modelsByBrand[r.brand].includes(r.model)) {
        modelsByBrand[r.brand].push(r.model);
      }
    });

    Object.keys(modelsByBrand).forEach((b) => modelsByBrand[b].sort());

    return NextResponse.json({
      success: true,
      count: items.length,
      brands,
      modelsByBrand,
      items,
    });
  } catch (error) {
    console.error("Part Catalog Prices API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch part catalog prices" },
      { status: 500 }
    );
  }
}
