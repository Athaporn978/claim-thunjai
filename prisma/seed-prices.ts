import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { readFileSync } from "node:fs";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

type Row = {
  vehicle_type: string;
  part_th: string;
  size: string;
  minor: number | null;
  moderate: number | null;
  severe: number | null;
  replace: number | null;
  note: string | null;
};

async function main() {
  const data: Row[] = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "prices.json"), "utf-8"),
  );
  console.log(`Loading ${data.length} price entries…`);

  // Dedupe on (vehicleType, partTh, size) — keep entry with most filled prices
  const seen = new Map<string, Row>();
  for (const r of data) {
    const key = `${r.vehicle_type}|${r.part_th}|${r.size}`;
    const score = (r: Row) => [r.minor, r.moderate, r.severe, r.replace].filter(Boolean).length;
    const existing = seen.get(key);
    if (!existing || score(r) > score(existing)) seen.set(key, r);
  }
  const unique = Array.from(seen.values());
  console.log(`After dedupe: ${unique.length} unique entries`);
  data.length = 0;
  data.push(...unique);

  await prisma.repairPrice.deleteMany({});

  // Batch insert
  const chunkSize = 100;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await prisma.repairPrice.createMany({
      data: chunk.map((r) => ({
        vehicleType: r.vehicle_type,
        partTh: r.part_th,
        size: r.size,
        minor: r.minor ?? null,
        moderate: r.moderate ?? null,
        severe: r.severe ?? null,
        replace: r.replace ?? null,
        note: r.note,
      })),
    });
  }

  const count = await prisma.repairPrice.count();
  const sample = await prisma.repairPrice.findMany({
    where: { partTh: "กันชนหน้า" },
  });
  console.log(`✓ ${count} prices seeded`);
  console.log(`Sample (กันชนหน้า):`);
  for (const s of sample) {
    console.log(`  ${s.vehicleType} size=${s.size}: minor=${s.minor} moderate=${s.moderate} severe=${s.severe} replace=${s.replace}`);
  }
}

main().finally(() => prisma.$disconnect());
