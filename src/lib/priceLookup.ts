/**
 * Maps Claude's English part names + vehicle/severity → labor-price catalog price.
 * Returns a price range (low/mid/high) in THB.
 *
 * Source: LaborPrice only (real per-brand/per-model data, 21 brands, see
 * scripts/import-labor-prices.ts). The old generic vehicleType+size RepairPrice
 * table was retired (stale, hadn't been updated in a long time) — a brand/model/part
 * not found in LaborPrice returns unmatched (null), never a guessed price.
 */
import { prisma } from "./db";
import { normalizePart } from "./partNameMap";

// AI/user-supplied make → canonical LaborPrice.brand casing (see BRAND_MAP in
// scripts/import-labor-prices.ts for the source-side half of this normalization).
const BRAND_ALIASES: Record<string, string> = {
  "toyota": "Toyota", "honda": "Honda", "isuzu": "Isuzu", "nissan": "Nissan",
  "mazda": "Mazda", "mitsubishi": "Mitsubishi", "mitsu": "Mitsubishi",
  "ford": "Ford", "mg": "MG", "byd": "BYD", "suzuki": "Suzuki",
  "gwm": "GWM", "great wall": "GWM", "haval": "GWM",
  "hyundai": "Hyundai", "subaru": "Subaru",
  "mercedes-benz": "Mercedes-Benz", "mercedes": "Mercedes-Benz", "benz": "Mercedes-Benz",
  "bmw": "BMW", "volvo": "Volvo", "tesla": "Tesla",
  "audi": "Audi", "mini": "MINI", "mini cooper": "MINI",
  "lexus": "Lexus", "porsche": "Porsche", "ora": "ORA", "deepal": "Deepal",
};

export function canonicalBrand(make: string | undefined): string | null {
  if (!make) return null;
  return BRAND_ALIASES[make.toLowerCase().trim()] ?? null;
}

// Map English part names from AI → canonical Thai part name in uklang catalog
const PART_MAP: Record<string, string> = {
  // Bumpers
  "front bumper": "กันชนหน้า",
  "rear bumper": "กันชนหลัง",
  "bumper": "กันชน",
  // Hood / trunk
  "hood": "ฝากระโปรงหน้า",
  "bonnet": "ฝากระโปรงหน้า",
  "trunk": "ฝากระโปรงหลัง",
  "trunk lid": "ฝากระโปรงหลัง",
  "tailgate": "ฝาปิดท้าย",
  // Fenders / quarter panels
  "front fender": "บังโคลนหน้า",
  "left front fender": "บังโคลนหน้า",
  "right front fender": "บังโคลนหน้า",
  "rear fender": "บังโคลนหลัง",
  "quarter panel": "บังโคลนหลัง",
  // Doors
  "front door": "ประตูหน้า",
  "rear door": "ประตูหลัง",
  "left front door": "ประตูหน้า",
  "right front door": "ประตูหน้า",
  "left rear door": "ประตูหลัง",
  "right rear door": "ประตูหลัง",
  // Lights
  "headlight": "ไฟหน้า",
  "headlight assembly": "ไฟหน้า",
  "taillight": "ไฟท้าย",
  "taillight assembly": "ไฟท้าย",
  // Glass
  "windshield": "กระจกบังลมหน้า",
  "rear window": "กระจกบังลมหลัง",
  "side mirror": "กระจกมองข้าง",
  // Grille / roof / rocker
  "grille": "กระจังหน้า",
  "front grille": "กระจังหน้า",
  "roof": "หลังคา",
  "rocker panel": "กาบประตูคิ้วข้าง",
  // Wheels
  "wheel": "ขอบล้อ",
  "rim": "ขอบล้อ",
  "alloy wheel": "ขอบล้อ",
};

// Vehicle make → uklang vehicle category
const ASIAN_MAKES = new Set([
  "toyota", "honda", "nissan", "mazda", "mitsubishi", "subaru", "suzuki", "isuzu", "lexus", "infiniti",
  "hyundai", "kia", "ssangyong", "byd", "mg", "great wall", "haval", "geely", "chery", "ora",
]);
const EU_MAKES = new Set([
  "bmw", "mercedes-benz", "mercedes", "audi", "volkswagen", "vw", "porsche", "volvo", "mini",
  "peugeot", "renault", "citroen", "fiat", "alfa romeo", "jaguar", "land rover", "rolls-royce", "bentley", "ferrari", "lamborghini", "maserati",
]);

export type VehicleType = "sedan_asia" | "sedan_eu" | "pickup" | "van";

export function classifyVehicle(opts: { make?: string; bodyType?: string }): VehicleType {
  const body = (opts.bodyType || "").toLowerCase();
  if (body.includes("pickup") || body.includes("truck")) return "pickup";
  if (body.includes("van") || body.includes("minivan")) return "van";
  const make = (opts.make || "").toLowerCase().trim();
  if (EU_MAKES.has(make)) return "sedan_eu";
  if (ASIAN_MAKES.has(make)) return "sedan_asia";
  // default
  return "sedan_asia";
}

export function classifySize(vehicleModel?: string): "A" | "B" | "C" {
  // A = compact (Vios, Yaris, Jazz, City), B = midsize sedan (Camry, Civic, Accord), C = large/luxury
  const m = (vehicleModel || "").toLowerCase();
  const small = ["yaris", "vios", "jazz", "march", "almera", "brio", "swift", "soluna", "city", "ciaz", "attrage", "mirage"];
  const large = ["7-series", "s-class", "lexus ls", "a8", "fortuner", "pajero", "everest", "land cruiser"];
  if (small.some((s) => m.includes(s))) return "A";
  if (large.some((s) => m.includes(s))) return "C";
  return "B";
}

export type DamageSeverity = "minor" | "moderate" | "severe";

export type PriceEstimate = {
  partTh: string;
  matched: boolean;
  vehicleType: VehicleType;
  size: "A" | "B" | "C";
  repair: number | null;     // estimated repair cost for this severity
  replace: number | null;    // full replacement cost
  low: number | null;        // min plausible cost (repair, if available)
  high: number | null;       // max plausible cost (replace)
  source: string;
};

export async function lookupPrice(args: {
  partEn: string;
  partTh?: string;
  severity: DamageSeverity;
  make?: string;
  model?: string;
  bodyType?: string;
}): Promise<PriceEstimate> {
  const vehicleType = classifyVehicle({ make: args.make, bodyType: args.bodyType });
  const size = classifySize(args.model);

  // Resolve canonical Thai part name — prefer the shared normalizer (also used at
  // LaborPrice import time) so query-side and data-side names line up; fall back to
  // the legacy local map / raw text for anything it doesn't recognize.
  const { standardName, position } = normalizePart(args.partTh || args.partEn);
  const enKey = args.partEn.toLowerCase().trim();
  const partTh = standardName || PART_MAP[enKey] || args.partTh || args.partEn;

  const empty: PriceEstimate = {
    partTh, matched: false, vehicleType, size,
    repair: null, replace: null, low: null, high: null,
    source: "LaborPrice (21-brand labor-code catalog)",
  };

  // LaborPrice — real per-brand/per-model data (21 brands). Only attempted when
  // the make resolves to a brand we actually imported; no match → unmatched.
  const brand = canonicalBrand(args.make);
  if (!brand) return empty;

  const laborRow = await lookupLaborPrice({ brand, model: args.model, partTh, position });
  if (!laborRow) return empty;

  const repair = (laborRow as unknown as Record<string, number | null>)[args.severity] ?? null;
  const replace = laborRow.replace ?? null;
  const numbers = [repair, replace].filter((v): v is number => v != null);
  return {
    partTh: laborRow.partTh,
    matched: true,
    vehicleType,
    size,
    repair,
    replace,
    low: numbers.length ? Math.min(...numbers) : null,
    high: numbers.length ? Math.max(...numbers) : null,
    source: `labor-code (${laborRow.brand})`,
  };
}

// brand+model+part+position → brand+model+part → (only if no model was supplied
// at all) brand+part. Deliberately does NOT fall back to brand-only pricing when a
// model WAS supplied but not found — prices vary too much between models of the same
// brand (e.g. BMW Series 1 vs Series 7) to guess from a different model. In that case
// the caller gets no match and the user enters the shop-quoted price directly.
export async function lookupLaborPrice(args: {
  brand: string; model?: string; partTh: string; position: "L" | "R" | null;
}) {
  const { brand, model, partTh, position } = args;

  if (!model) {
    return prisma.laborPrice.findFirst({
      where: { brand, partTh: { contains: partTh } },
    });
  }

  if (position) {
    const row = await prisma.laborPrice.findFirst({
      where: { brand, model: { contains: model }, partTh: { contains: partTh }, position },
    });
    if (row) return row;
  }
  return prisma.laborPrice.findFirst({
    where: { brand, model: { contains: model }, partTh: { contains: partTh } },
  });
}

export async function estimateTotal(damages: Array<{
  part: string;
  partTh?: string;
  severity: DamageSeverity;
}>, vehicle: { make?: string; model?: string; bodyType?: string }) {
  const items = await Promise.all(
    damages.map((d) =>
      lookupPrice({
        partEn: d.part,
        partTh: d.partTh,
        severity: d.severity,
        make: vehicle.make,
        model: vehicle.model,
        bodyType: vehicle.bodyType,
      }).then((p) => ({ ...p, damageSeverity: d.severity, originalPart: d.part }))
    ),
  );
  const totalLow = items.reduce((s, i) => s + (i.low ?? 0), 0);
  const totalHigh = items.reduce((s, i) => s + (i.high ?? 0), 0);
  const matchedCount = items.filter((i) => i.matched).length;
  return { items, totalLow, totalHigh, matchedCount, totalCount: items.length };
}
