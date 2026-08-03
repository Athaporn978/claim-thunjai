import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { totals, genQuotationNo, type QuotationInput } from "@/lib/quotation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quotations → list (newest first)
export async function GET() {
  try {
    const rows = await prisma.quotation.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } }, branch: true },
    });

    // Auto-seed realistic quotations if empty
    if (rows.length === 0) {
      await prisma.quotation.create({
        data: {
          quotationNo: "QT-2026-0001",
          status: "completed",
          customerName: "สมชาย ใจดี",
          licensePlate: "กข 1234 กรุงเทพมหานคร",
          vehicleCategory: "sedan_asia",
          vehicleBrand: "Toyota",
          vehicleModel: "Camry",
          vehicleYear: 2022,
          chassisNo: "MR053K12345678901",
          color: "ขาวมุก",
          mileage: 45000,
          insurerName: "วิริยะประกันภัย",
          claimNo: "CLM-2026-9876",
          insVehicleType: "เก๋งเอเชีย",
          policyNo: "POL-888999",
          policyType: "ประเภท 1",
          sumInsured: 750000,
          centerName: "ศูนย์บริการโตโยต้า สุขุมวิท",
          centerContact: "02-123-4567",
          vehicleSize: "B",
          totalQuoted: 28500,
          totalControlled: 22400,
          totalSaving: 6100,
          items: {
            create: [
              { type: "part", name: "กันชนหน้า (Front Bumper)", quotedUnit: 8500, quotedQty: 1, controlledUnit: 6800, controlledQty: 1, standardPrice: 6500, sortOrder: 0 },
              { type: "part", name: "ไฟหน้าขวา (Right Headlight)", quotedUnit: 12000, quotedQty: 1, controlledUnit: 9800, controlledQty: 1, standardPrice: 9500, sortOrder: 1 },
              { type: "labor", name: "ค่าแรงเคาะพ่นสีกันชนหน้า", quotedUnit: 4500, quotedQty: 1, controlledUnit: 3500, controlledQty: 1, standardPrice: 3500, sortOrder: 2 },
              { type: "labor", name: "ค่าถอดประกอบไฟหน้า", quotedUnit: 3500, quotedQty: 1, controlledUnit: 2300, controlledQty: 1, standardPrice: 2000, sortOrder: 3 },
            ],
          },
        },
      });

      await prisma.quotation.create({
        data: {
          quotationNo: "QT-2026-0002",
          status: "completed",
          customerName: "วิภาวรรณ ขยันยิ่ง",
          licensePlate: "ขก 5678 เชียงใหม่",
          vehicleCategory: "suv",
          vehicleBrand: "Honda",
          vehicleModel: "CR-V",
          vehicleYear: 2023,
          chassisNo: "HK098J76543210987",
          color: "ดำ",
          mileage: 28000,
          insurerName: "กรุงเทพประกันภัย",
          claimNo: "CLM-2026-5432",
          insVehicleType: "SUV 7 ที่นั่ง",
          policyNo: "POL-777666",
          policyType: "ประเภท 1",
          sumInsured: 950000,
          centerName: "อู่เจริญการช่าง เชียงใหม่",
          centerContact: "053-987-654",
          vehicleSize: "C",
          totalQuoted: 42000,
          totalControlled: 33500,
          totalSaving: 8500,
          items: {
            create: [
              { type: "part", name: "ฝากระโปรงหน้า (Hood)", quotedUnit: 15500, quotedQty: 1, controlledUnit: 12500, controlledQty: 1, standardPrice: 12000, sortOrder: 0 },
              { type: "part", name: "กระจังหน้า (Front Grille)", quotedUnit: 9500, quotedQty: 1, controlledUnit: 7800, controlledQty: 1, standardPrice: 7500, sortOrder: 1 },
              { type: "labor", name: "ค่าแรงทำสีฝากระโปรงหน้า", quotedUnit: 9000, quotedQty: 1, controlledUnit: 7200, controlledQty: 1, standardPrice: 7000, sortOrder: 2 },
              { type: "labor", name: "ค่าตั้งศูนย์ถ่วงล้อ", quotedUnit: 8000, quotedQty: 1, controlledUnit: 6000, controlledQty: 1, standardPrice: 5500, sortOrder: 3 },
            ],
          },
        },
      });

      await prisma.quotation.create({
        data: {
          quotationNo: "QT-2026-0003",
          status: "draft",
          customerName: "อรรถพล โชคชัย",
          licensePlate: "ฮฮ 999 กรุงเทพมหานคร",
          vehicleCategory: "pickup",
          vehicleBrand: "Isuzu",
          vehicleModel: "D-Max",
          vehicleYear: 2021,
          chassisNo: "IZ999M11223344556",
          color: "เทา",
          mileage: 62000,
          insurerName: "มิตซุย สุมิโตโม ประกันภัย",
          claimNo: "CLM-2026-1122",
          insVehicleType: "กระบะ 4 ประตู",
          policyNo: "POL-555444",
          policyType: "ประเภท 1",
          sumInsured: 680000,
          centerName: "อู่นครปฐมการช่าง",
          centerContact: "034-555-666",
          vehicleSize: "B",
          totalQuoted: 18000,
          totalControlled: 14500,
          totalSaving: 3500,
          items: {
            create: [
              { type: "part", name: "ไฟท้ายซ้าย (Left Taillight)", quotedUnit: 6500, quotedQty: 1, controlledUnit: 5200, controlledQty: 1, standardPrice: 5000, sortOrder: 0 },
              { type: "labor", name: "ค่าแรงทำสีแก้มข้างซ้าย", quotedUnit: 11500, quotedQty: 1, controlledUnit: 9300, controlledQty: 1, standardPrice: 9000, sortOrder: 1 },
            ],
          },
        },
      });

      const seededRows = await prisma.quotation.findMany({
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { items: true } }, branch: true },
      });
      return NextResponse.json({ quotations: seededRows });
    }

    return NextResponse.json({ quotations: rows });
  } catch (err) {
    console.error("GET quotations error:", err);
    return NextResponse.json({ quotations: [], error: String(err) }, { status: 500 });
  }
}

// POST /api/quotations → create
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuotationInput;
    const t = totals(body.items || []);

    // Load Workflow Settings to determine initial status
    const wfSetting = await prisma.workflowSetting.findUnique({ where: { id: "default" } });
    const isWfDisabled = !wfSetting || wfSetting.enabled === false || wfSetting.ruleMode === "DIRECT";
    const targetStatus = isWfDisabled ? "approved" : (body.status === "draft" ? "draft" : "pending_approval");

    const createdByEmail = (body as any).createdByEmail || "somchai@techthunjai.com";
    const createdByName = (body as any).createdByName || (createdByEmail.includes("kanya") ? "กัญญา มีสุข" : "สมชาย ใจดี");

    // Assign Creator Branch
    let branchId = (body as any).branchId;
    if (!branchId) {
      const bName = (body as any).branchName || (createdByEmail.includes("kanya") ? "เชียงใหม่" : "ลาดพร้าว");
      const matchedBranch = await prisma.branch.findFirst({
        where: { name: { contains: bName.replace(/\(.*\)/, "").trim() } },
      });
      if (matchedBranch) {
        branchId = matchedBranch.id;
      } else {
        const latPhraoBranch = await prisma.branch.findFirst({ where: { code: "BR-01" } });
        branchId = latPhraoBranch?.id;
      }
    }

    const created = await prisma.quotation.create({
      data: {
        quotationNo: body.quotationNo || genQuotationNo(),
        status: targetStatus,
        branchId,
        createdByName,
        createdByEmail,
        customerName: body.customerName ?? null,
        licensePlate: body.licensePlate ?? null,
        vehicleCategory: body.vehicleCategory ?? null,
        vehicleBrand: body.vehicleBrand ?? null,
        vehicleModel: body.vehicleModel ?? null,
        vehicleYear: body.vehicleYear ?? null,
        chassisNo: body.chassisNo ?? null,
        color: body.color ?? null,
        mileage: body.mileage ?? null,
        insurerName: body.insurerName ?? null,
        claimNo: body.claimNo ?? null,
        insVehicleType: body.insVehicleType ?? null,
        policyNo: body.policyNo ?? null,
        policyType: body.policyType ?? null,
        sumInsured: body.sumInsured ?? null,
        coverageStart: body.coverageStart ? new Date(body.coverageStart) : null,
        coverageEnd: body.coverageEnd ? new Date(body.coverageEnd) : null,
        deductible: body.deductible ?? null,
        centerName: body.centerName ?? null,
        centerAddress: body.centerAddress ?? null,
        centerContact: body.centerContact ?? null,
        vehicleSize: body.vehicleSize || "B",
        photos: body.photos && body.photos.length ? JSON.stringify(body.photos) : null,
        totalQuoted: t.totalQuoted,
        totalControlled: t.totalControlled,
        totalSaving: t.totalSaving,
        items: {
          create: (body.items || []).map((i, idx) => ({
            type: i.type,
            name: i.name,
            quotedUnit: Number(i.quotedUnit) || 0,
            quotedQty: Number(i.quotedQty) || 0,
            controlledUnit: Number(i.controlledUnit) || 0,
            controlledQty: Number(i.controlledQty) || 0,
            standardPrice: i.standardPrice ?? null,
            note: i.note ?? null,
            sortOrder: i.sortOrder ?? idx,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ quotation: created });
  } catch (err) {
    console.error("Create quotation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
