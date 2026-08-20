/**
 * Imports the repair-shop labor-code Excel workbook into the LaborPrice table.
 *
 * Source: /Users/arthur/Documents/Customer/H Tech/Labor Motor/Labor_Motor_Car_Brands.xlsx
 * 21 sheets, one per brand. Column layout is NOT consistent across sheets — some
 * sheets insert extra columns (ถอดประกอบ/ขัดสี/พ่นสีภายนอก/พ่นสีภายใน) BEFORE the
 * standard เปลี่ยน/S/M/L columns, shifting their position. This script reads every
 * sheet by HEADER NAME, never by column index, to stay correct across that variance.
 *
 * Run: npx tsx scripts/import-labor-prices.ts
 */
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { normalizePart, normalizePosition } from "../src/lib/partNameMap";

const EXCEL_PATH = "/Users/arthur/Documents/Customer/H Tech/Labor Motor/Labor_Motor_Car_Brands.xlsx";

// Sheet brand-column value → canonical brand name (matches src/lib/carCatalog.ts where possible).
const BRAND_MAP: Record<string, string> = {
  "audi": "Audi",
  "benz": "Mercedes-Benz",
  "bmw": "BMW",
  "mini cooper": "MINI",
  "byd": "BYD",
  "deepal s07": "Deepal", // brand cell wrongly includes the model name
  "gwm": "GWM",
  "hyundai": "Hyundai",
  "isuzu": "Isuzu",
  "lexus": "Lexus",
  "mg": "MG",
  "mazda": "Mazda",
  "mitsu": "Mitsubishi",
  "nissan": "Nissan",
  "porsche": "Porsche",
  "subaru": "Subaru",
  "suzuki": "Suzuki",
  "tesla": "Tesla",
  "volvo": "Volvo",
  "ford": "Ford",
};

// Sheets where the source Brand/Model columns are wrong or redundant and need a
// full override rather than a simple brand-name remap (see conversation history —
// Ora Goodcat's Brand column says "GWM" because ORA is a GWM sub-brand, but the app
// treats ORA as its own brand; the Model column redundantly repeats "ORA Goodcat").
const SHEET_OVERRIDES: Record<string, { brand?: string; model?: (raw: string) => string }> = {
  "Ora Goodcat": { brand: "ORA", model: (raw) => raw.replace(/^ORA\s*/i, "").trim() || raw },
};

// Extra granular labor-op columns present in some sheets (ถอดประกอบ/ขัดสี/พ่นสีภายนอก/
// พ่นสีภายใน/พ่นสี/Type). Used as a fallback price source when Replace/S/M/L are all
// empty — these represent flat-rate single-operation service items (e.g. "ขัดสี กันชนหน้า").
const EXTRA_COLUMNS = ["ถอดประกอบ", "ขัดสี", "พ่นสีภายนอก", "พ่นสีภายใน", "พ่นสี"];

function normalizeBrand(sheetName: string, rawBrand: string): string {
  const override = SHEET_OVERRIDES[sheetName]?.brand;
  if (override) return override;
  const key = rawBrand.trim().toLowerCase();
  return BRAND_MAP[key] ?? rawBrand.trim();
}

function normalizeModel(sheetName: string, rawModel: string): string {
  const override = SHEET_OVERRIDES[sheetName]?.model;
  return override ? override(rawModel) : rawModel.trim();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Row = Record<string, unknown>;

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(process.cwd(), "dev.db")}` });
  const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

  const wb = XLSX.readFile(EXCEL_PATH);
  let totalImported = 0;
  let totalSkippedNoBrand = 0;
  let totalSkippedNoModel = 0;
  let totalSkippedNoPrice = 0;
  const perSheet: Record<string, number> = {};

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: Row[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    const toInsert: {
      brand: string; model: string; submodel: string | null; position: string | null;
      partTh: string; partThRaw: string;
      replace: number | null; minor: number | null; moderate: number | null; severe: number | null;
      remark: string | null; sourceSheet: string;
    }[] = [];

    for (const row of rows) {
      const rawBrand = String(row["ยี่ห้อ (Brand)"] ?? "").trim();
      if (!rawBrand) { totalSkippedNoBrand++; continue; }

      const rawModel = String(row["รุ่น (Model)"] ?? "").trim();
      if (!rawModel) { totalSkippedNoModel++; continue; }

      const rawSubject = String(row["รายการ (Subject)"] ?? "").trim();
      if (!rawSubject) continue;

      const submodelKey = Object.keys(row).find((k) => k.startsWith("รุ่นย่อย"));
      const rawSubmodel = submodelKey ? String(row[submodelKey] ?? "").trim() : "";

      const rawPositionCol = String(row["ตำแหน่ง (L/R)"] ?? "").trim();
      const position = normalizePosition(rawPositionCol) ?? normalizePosition(rawSubject);

      const { standardName } = normalizePart(rawSubject);
      const partTh = standardName ?? rawSubject; // fall back to raw text if unmapped

      let replace = num(row["เปลี่ยน (Replace)"]);
      let minor = num(row["ซ่อมเบา (S)"]);
      let moderate = num(row["ซ่อมกลาง (M)"]);
      let severe = num(row["ซ่อมหนัก (L)"]);

      // All 4 severity tiers empty — fall back to an extra granular labor-op column
      // (flat-rate single-operation service item, e.g. "ขัดสี กันชนหน้า" = 150 บาท).
      if (replace === null && minor === null && moderate === null && severe === null) {
        for (const col of EXTRA_COLUMNS) {
          const v = num(row[col]);
          if (v !== null) { replace = v; break; }
        }
      }

      if (replace === null && minor === null && moderate === null && severe === null) {
        totalSkippedNoPrice++;
        continue;
      }

      const brand = normalizeBrand(sheetName, rawBrand);
      const model = normalizeModel(sheetName, rawModel);
      const remark = row["หมายเหตุ (Remark)"] ? String(row["หมายเหตุ (Remark)"]).trim() : null;

      toInsert.push({
        brand, model,
        submodel: rawSubmodel || null,
        position,
        partTh, partThRaw: rawSubject,
        replace, minor, moderate, severe,
        remark, sourceSheet: sheetName,
      });
    }

    if (toInsert.length > 0) {
      await prisma.laborPrice.createMany({ data: toInsert });
    }
    perSheet[sheetName] = toInsert.length;
    totalImported += toInsert.length;
  }

  console.log("=== Import summary ===");
  for (const [sheet, count] of Object.entries(perSheet)) {
    console.log(`  ${sheet.padEnd(15)} ${count}`);
  }
  console.log(`\nTotal imported: ${totalImported}`);
  console.log(`Skipped (no brand): ${totalSkippedNoBrand}`);
  console.log(`Skipped (no model): ${totalSkippedNoModel}`);
  console.log(`Skipped (no price at all): ${totalSkippedNoPrice}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
