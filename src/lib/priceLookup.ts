/**
 * Maps Claude's English part names + vehicle/severity → uklang Thai catalog price.
 * Returns a price range (low/mid/high) in THB.
 */
import { prisma } from "./db";

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

  // Resolve canonical Thai part name
  const enKey = args.partEn.toLowerCase().trim();
  let partTh = PART_MAP[enKey];
  if (!partTh && args.partTh) {
    // try direct match using AI-supplied Thai
    partTh = args.partTh;
  }
  if (!partTh) partTh = args.partTh || args.partEn;

  const empty: PriceEstimate = {
    partTh, matched: false, vehicleType, size,
    repair: null, replace: null, low: null, high: null,
    source: "uklang.com (สมาคมอู่กลางการประกันภัย)",
  };

  // Try exact match first
  let row = await prisma.repairPrice.findFirst({
    where: { vehicleType, partTh, size },
  });

  // Fall back to partial Thai name match
  if (!row) {
    row = await prisma.repairPrice.findFirst({
      where: {
        vehicleType,
        size,
        partTh: { contains: partTh.replace(/หน้า|หลัง|ซ้าย|ขวา/g, "").trim() || partTh },
      },
    });
  }

  if (!row) return empty;

  const repairKey = args.severity;
  const repair = (row as unknown as Record<string, number | null>)[repairKey] ?? null;
  const replace = row.replace ?? null;

  const numbers = [repair, replace].filter((v): v is number => v != null);
  return {
    partTh: row.partTh,
    matched: true,
    vehicleType,
    size,
    repair,
    replace,
    low: numbers.length ? Math.min(...numbers) : null,
    high: numbers.length ? Math.max(...numbers) : null,
    source: "uklang.com (สมาคมอู่กลางการประกันภัย)",
  };
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
