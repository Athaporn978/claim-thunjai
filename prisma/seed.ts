import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const allianz = await prisma.insurer.upsert({
    where: { apiKey: "demo-allianz-key" },
    update: {},
    create: {
      apiKey: "demo-allianz-key",
      name: "Allianz Ayudhya",
      nameTh: "อลิอันซ์ อยุธยา",
      plan: "enterprise",
    },
  });

  const aig = await prisma.insurer.upsert({
    where: { apiKey: "demo-aig-key" },
    update: {},
    create: {
      apiKey: "demo-aig-key",
      name: "AIG Thailand",
      nameTh: "เอไอจี ประเทศไทย",
      plan: "pro",
    },
  });

  const demoClaims = [
    {
      claimNumber: "CLM-2026-001",
      insurerId: allianz.id,
      policyHolder: "สมชาย ใจดี",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: 2022,
      licensePlate: "กข-1234",
      status: "analyzed",
      overallSeverity: "moderate",
    },
    {
      claimNumber: "CLM-2026-002",
      insurerId: allianz.id,
      policyHolder: "Naruto Yamada",
      vehicleMake: "BMW",
      vehicleModel: "320i",
      vehicleYear: 2023,
      licensePlate: "ขค-5678",
      status: "analyzed",
      overallSeverity: "minor",
    },
    {
      claimNumber: "CLM-2026-003",
      insurerId: aig.id,
      policyHolder: "Anna Müller",
      vehicleMake: "Mercedes-Benz",
      vehicleModel: "C-Class",
      vehicleYear: 2024,
      licensePlate: "คง-9012",
      status: "reviewed",
      overallSeverity: "severe",
    },
  ];

  for (const c of demoClaims) {
    await prisma.claim.upsert({
      where: { claimNumber: c.claimNumber },
      update: {},
      create: c,
    });
  }

  console.log("✓ Seeded:", { allianz: allianz.id, aig: aig.id });
}

main().finally(() => prisma.$disconnect());
