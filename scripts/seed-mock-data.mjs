import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(process.cwd(), "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

const MOCK_BRANCHES = [
  { code: "BR-01", name: "สาขากรุงเทพฯ (ลาดพร้าว)", address: "123 ถนนลาดพร้าว จตุจักร กรุงเทพฯ 10900", phone: "02-511-1111" },
  { code: "BR-02", name: "สาขากรุงเทพฯ (ปิ่นเกล้า)", address: "456 ถนนบรมราชชนนี บางกอกน้อย กรุงเทพฯ 10700", phone: "02-433-2222" },
  { code: "BR-03", name: "สาขากรุงเทพฯ (พระราม 9)", address: "789 ถนนพระราม 9 ห้วยขวาง กรุงเทพฯ 10310", phone: "02-245-3333" },
  { code: "BR-04", name: "สาขากรุงเทพฯ (บางนา)", address: "101 ถนนเทพรัตน บางนา กรุงเทพฯ 10260", phone: "02-398-4444" },
  { code: "BR-05", name: "สาขากรุงเทพฯ (สุขุมวิท)", address: "202 ถนนสุขุมวิท วัฒนา กรุงเทพฯ 10110", phone: "02-714-5555" },
  { code: "BR-06", name: "สาขาเชียงใหม่", address: "88 ถนนซูเปอร์ไฮเวย์ เมือง เชียงใหม่ 50000", phone: "053-123-456" },
  { code: "BR-07", name: "สาขาพิษณุโลก", address: "99 ถนนสิงหวัฒน์ เมือง พิษณุโลก 65000", phone: "055-234-567" },
  { code: "BR-08", name: "สาขาขอนแก่น", address: "77 ถนนมิตรภาพ เมือง ขอนแก่น 40000", phone: "043-345-678" },
  { code: "BR-09", name: "สาขานครราชสีมา", address: "55 ถนนมิตรภาพ เมือง นครราชสีมา 30000", phone: "044-456-789" },
  { code: "BR-10", name: "สาขาชลบุรี", address: "33 ถนนสุขุมวิท เมือง ชลบุรี 20000", phone: "038-567-890" },
  { code: "BR-11", name: "สาขาระยอง", address: "44 ถนนสุขุมวิท เมือง ระยอง 21000", phone: "038-678-901" },
  { code: "BR-12", name: "สาขาภูเก็ต", address: "66 ถนนเทพกระษัตรี เมือง ภูเก็ต 83000", phone: "076-789-012" },
  { code: "BR-13", name: "สาขาสุราษฎร์ธานี", address: "22 ถนนเลี่ยงเมือง เมือง สุราษฎร์ธานี 84000", phone: "077-890-123" },
  { code: "BR-14", name: "สาขาหาดใหญ่", address: "11 ถนนกาญจนวนิช หาดใหญ่ สงขลา 90110", phone: "074-901-234" },
  { code: "BR-15", name: "สาขานครปฐม", address: "33 ถนนเพชรเกษม เมือง นครปฐม 73000", phone: "034-012-345" }
];

async function main() {
  console.log("🌱 Syncing Mock Data with Existing Default Roles...");

  // 1. Seed Branches
  const createdBranches = [];
  for (const b of MOCK_BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: { name: b.name, address: b.address, phone: b.phone },
      create: { code: b.code, name: b.name, address: b.address, phone: b.phone, status: "active" }
    });
    createdBranches.push(branch);
  }
  console.log(`✅ Seeded ${createdBranches.length} Branches successfully.`);

  // 2. Ensure Default System Roles are mapped (ROLE-ADMIN, ROLE-CONTROLLER, ROLE-CENTER, ROLE-VIEWER)
  const adminRole = await prisma.role.upsert({
    where: { code: "ROLE-ADMIN" },
    update: { name: "Super Administrator", description: "บทบาทสูงสุดสำหรับผู้ดูแลระบบ จัดการได้ทุกเมนู", permissions: JSON.stringify(["all"]) },
    create: { code: "ROLE-ADMIN", name: "Super Administrator", description: "บทบาทสูงสุดสำหรับผู้ดูแลระบบ จัดการได้ทุกเมนู", permissions: JSON.stringify(["all"]), status: "active" }
  });

  const controllerRole = await prisma.role.upsert({
    where: { code: "ROLE-CONTROLLER" },
    update: { name: "เจ้าหน้าที่คุมราคา (Adjuster)", description: "บทบาทตรวจสอบ อนุมัติ และปรับราคาหลังคุมใบเสนอราคาซ่อม", permissions: JSON.stringify(["quotation_review", "catalog_view"]) },
    create: { code: "ROLE-CONTROLLER", name: "เจ้าหน้าที่คุมราคา (Adjuster)", description: "บทบาทตรวจสอบ อนุมัติ และปรับราคาหลังคุมใบเสนอราคาซ่อม", permissions: JSON.stringify(["quotation_review", "catalog_view"]), status: "active" }
  });

  await prisma.role.upsert({
    where: { code: "ROLE-CENTER" },
    update: { name: "เจ้าหน้าที่ศูนย์บริการ/อู่", description: "บทบาทอัปโหลดเอกสารใบเสนอราคาและเสนอราคาซ่อม", permissions: JSON.stringify(["quotation_create", "intake_view"]) },
    create: { code: "ROLE-CENTER", name: "เจ้าหน้าที่ศูนย์บริการ/อู่", description: "บทบาทอัปโหลดเอกสารใบเสนอราคาและเสนอราคาซ่อม", permissions: JSON.stringify(["quotation_create", "intake_view"]), status: "active" }
  });

  await prisma.role.upsert({
    where: { code: "ROLE-VIEWER" },
    update: { name: "ผู้ดูรายงาน (Viewer)", description: "บทบาทเข้าดูรายงานและสรุปยอดประหยัด (Read Only)", permissions: JSON.stringify(["reports_read"]) },
    create: { code: "ROLE-VIEWER", name: "ผู้ดูรายงาน (Viewer)", description: "บทบาทเข้าดูรายงานและสรุปยอดประหยัด (Read Only)", permissions: JSON.stringify(["reports_read"]), status: "active" }
  });

  const supervisorRole = await prisma.role.upsert({
    where: { code: "ROLE-SUPERVISOR" },
    update: { name: "หัวหน้าคุมราคา (Supervisor)", description: "บทบาทหัวหน้าคุมราคา ตรวจสอบและอนุมัติใบเสนอราคาประจำสาขา", permissions: JSON.stringify(["quotation_approve", "quotation_review", "catalog_view"]) },
    create: { code: "ROLE-SUPERVISOR", name: "หัวหน้าคุมราคา (Supervisor)", description: "บทบาทหัวหน้าคุมราคา ตรวจสอบและอนุมัติใบเสนอราคาประจำสาขา", permissions: JSON.stringify(["quotation_approve", "quotation_review", "catalog_view"]), status: "active" }
  });

  // Re-assign any employees using duplicate role before deleting duplicate roles
  const duplicateRoles = await prisma.role.findMany({
    where: { code: { notIn: ["ROLE-ADMIN", "ROLE-SUPERVISOR", "ROLE-CONTROLLER", "ROLE-CENTER", "ROLE-VIEWER"] } }
  });

  for (const dup of duplicateRoles) {
    await prisma.employee.updateMany({
      where: { roleId: dup.id },
      data: { roleId: controllerRole.id }
    });
    await prisma.role.delete({ where: { id: dup.id } });
    console.log(`🧹 Removed duplicate role: ${dup.name} (${dup.code})`);
  }

  // 3. Seed Sample Employees pointing to official system roles
  const employees = [
    { code: "EMP-001", name: "ผู้บริหารระบบ (Super Admin)", email: "admin@htechnology.com", username: "admin", roleId: adminRole.id, branchId: createdBranches[0].id },
    { code: "EMP-002", name: "สมชาย ใจดี (คุมราคา-ลาดพร้าว)", email: "somchai@htechnology.com", username: "staff_latphrao", roleId: controllerRole.id, branchId: createdBranches[0].id },
    { code: "EMP-003", name: "กัญญา มีสุข (คุมราคา-เชียงใหม่)", email: "kanya@htechnology.com", username: "staff_chiangmai", roleId: controllerRole.id, branchId: createdBranches[5].id },
    { code: "EMP-004", name: "วิชัย สุขสันต์ (คุมราคา-ภูเก็ต)", email: "wichai@htechnology.com", username: "staff_phuket", roleId: controllerRole.id, branchId: createdBranches[11].id },
    { code: "EMP-005", name: "สมเกียรติ ยิ่งใหญ่ (หัวหน้าคุมราคา-ลาดพร้าว)", email: "supervisor_latphrao@htechnology.com", username: "sup_latphrao", roleId: supervisorRole.id, branchId: createdBranches[0].id },
    { code: "EMP-006", name: "นภา สว่างจิต (หัวหน้าคุมราคา-เชียงใหม่)", email: "supervisor_chiangmai@htechnology.com", username: "sup_chiangmai", roleId: supervisorRole.id, branchId: createdBranches[5].id },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: { name: emp.name, email: emp.email, roleId: emp.roleId, branchId: emp.branchId, password: "123456" },
      create: { code: emp.code, name: emp.name, email: emp.email, username: emp.username, roleId: emp.roleId, branchId: emp.branchId, password: "123456", status: "active" }
    });
  }
  console.log("✅ Seeded Sample Employees linked to official Roles.");

  // 4. Update Quotations in Database to assign them to Branches
  const quotations = await prisma.quotation.findMany();
  console.log(`Found ${quotations.length} Quotations in Database. Assigning branches...`);

  const latPhraoBranch = createdBranches[0]; // สาขาลาดพร้าว (กรุงเทพมหานคร)
  const chiangMaiBranch = createdBranches[5] || createdBranches[1]; // สาขาเชียงใหม่

  for (let i = 0; i < quotations.length; i++) {
    const q = quotations[i];
    
    // Set Creators & Branch Scoping:
    // QT-2026-39448 -> Somchai (Lat Phrao)
    // QT-2026-0002 -> Kanya (Chiang Mai)
    // All other cases (QT-2026-0001, QT-2026-0003, QT-2026-81796) -> Admin (HQ)
    let creatorName = "ผู้ดูแลระบบ (Super Admin)";
    let creatorEmail = "admin@htechnology.com";
    let assignedBranchId = null;

    if (q.quotationNo === "QT-2026-39448") {
      creatorName = "สมชาย ใจดี";
      creatorEmail = "somchai@htechnology.com";
      assignedBranchId = latPhraoBranch.id;
    } else if (q.quotationNo === "QT-2026-0002" || q.licensePlate?.includes("เชียงใหม่")) {
      creatorName = "กัญญา มีสุข";
      creatorEmail = "kanya@htechnology.com";
      assignedBranchId = chiangMaiBranch.id;
    }

    let updatedCustomerName = q.customerName;
    if (q.quotationNo === "QT-2026-0001" || q.customerName === "สมชาย ใจดี") {
      updatedCustomerName = "คุณสมศักดิ์ มั่งคั่ง";
    } else if (q.quotationNo === "QT-2026-0003") {
      updatedCustomerName = "คุณธีรยุทธ รักดี";
    }

    const isAi = i % 2 === 0;
    const procSec = isAi ? (120 + (i * 45) % 240) : (900 + (i * 300) % 1200);
    const createdTime = q.createdAt ? new Date(q.createdAt) : new Date();
    const startTime = new Date(createdTime.getTime() - procSec * 1000);
    const submitTime = createdTime;

    await prisma.quotation.update({
      where: { id: q.id },
      data: {
        branchId: assignedBranchId,
        customerName: updatedCustomerName,
        createdByName: creatorName,
        createdByEmail: creatorEmail,
        creationMode: isAi ? "ai_extract" : "manual",
        startedAt: startTime,
        submittedAt: submitTime,
        processingTimeSec: procSec,
      }
    });
  }
  console.log("✅ All Quotations linked to Branches & SLA Timestamps in Database!");

  // 5. Seed Realistic Part Catalog Prices
  try {
    const fs = await import("node:fs");
    const mockPricesPath = path.join(process.cwd(), "data", "mock_part_prices.json");
    if (fs.existsSync(mockPricesPath)) {
      const partPrices = JSON.parse(fs.readFileSync(mockPricesPath, "utf-8"));
      console.log(`📦 Seeding ${partPrices.length} Part Catalog Price records...`);
      for (const item of partPrices) {
        await prisma.partCatalogPrice.upsert({
          where: {
            brand_model_partTh: {
              brand: item.brand,
              model: item.model,
              partTh: item.partTh
            }
          },
          update: {
            yearRange: item.yearRange,
            category: item.category,
            partEn: item.partEn,
            oemPrice: item.oemPrice,
            aftermarketPrice: item.aftermarketPrice,
            usedPrice: item.usedPrice,
            note: item.note
          },
          create: {
            brand: item.brand,
            model: item.model,
            yearRange: item.yearRange,
            category: item.category,
            partTh: item.partTh,
            partEn: item.partEn,
            oemPrice: item.oemPrice,
            aftermarketPrice: item.aftermarketPrice,
            usedPrice: item.usedPrice,
            note: item.note
          }
        });
      }
      console.log("✅ Part Catalog Prices seeded successfully!");
    }
  } catch (err) {
    console.error("Warning: Could not seed Part Catalog Prices:", err);
  }

  // 6. Seed Official uklang Repair Prices (Labor)
  try {
    const fs = await import("node:fs");
    let pricesPath = path.join(process.cwd(), "data", "prices.json");
    if (!fs.existsSync(pricesPath)) {
      pricesPath = path.join(process.cwd(), "data", "prices 11.32.17.json");
    }
    if (fs.existsSync(pricesPath)) {
      const data = JSON.parse(fs.readFileSync(pricesPath, "utf-8"));
      console.log(`🔨 Seeding ${data.length} Official Repair Price (Labor) records...`);
      
      const seen = new Map();
      for (const r of data) {
        const key = `${r.vehicle_type}|${r.part_th}|${r.size}`;
        const score = (row) => [row.minor, row.moderate, row.severe, row.replace].filter(Boolean).length;
        const existing = seen.get(key);
        if (!existing || score(r) > score(existing)) seen.set(key, r);
      }
      const unique = Array.from(seen.values());
      
      await prisma.repairPrice.deleteMany({});
      const chunkSize = 100;
      for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
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
      console.log(`✅ ${unique.length} Official Repair Prices (Labor) seeded successfully!`);
    }
  } catch (err) {
    console.error("Warning: Could not seed Repair Prices:", err);
  }

  console.log("🎉 Cleanup and Sync completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
