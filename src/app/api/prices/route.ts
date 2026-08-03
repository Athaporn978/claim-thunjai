import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Tiers = { minor: number | null; moderate: number | null; severe: number | null; replace: number | null };

// Returns priced parts for a vehicleType. Prefers the requested size, but falls
// back to another size when a part is only listed once (uklang lists many parts
// at a single representative size), so callers get a price instead of N/A.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vehicleType = searchParams.get("vehicleType") || "sedan_asia";
  const size = searchParams.get("size") || "B";

  const rows = await prisma.repairPrice.findMany({
    where: { vehicleType },
    orderBy: { partTh: "asc" },
  });

  // size preference: requested → B → A → C
  const order = [size, "B", "A", "C"].filter((s, i, a) => a.indexOf(s) === i);
  const rank = (s: string) => {
    const i = order.indexOf(s);
    return i === -1 ? order.length : i;
  };
  const hasVal = (t: Tiers) => t.minor != null || t.moderate != null || t.severe != null || t.replace != null;

  // For each partTh keep the row with the best size rank that has any value.
  const best: Record<string, { rank: number; tiers: Tiers }> = {};
  for (const p of rows) {
    const tiers: Tiers = { minor: p.minor, moderate: p.moderate, severe: p.severe, replace: p.replace };
    if (!hasVal(tiers)) continue;
    const r = rank(p.size);
    const cur = best[p.partTh];
    if (!cur || r < cur.rank) best[p.partTh] = { rank: r, tiers };
  }

  const map: Record<string, Tiers> = {};
  for (const k of Object.keys(best)) map[k] = best[k].tiers;

  return NextResponse.json({ vehicleType, size, count: Object.keys(map).length, prices: map });
}
