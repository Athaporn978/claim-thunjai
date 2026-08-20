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

    const createdByEmail = (body as any).createdByEmail || "somchai@htechnology.com";
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
