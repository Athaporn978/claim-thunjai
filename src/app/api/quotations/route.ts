import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { totals, type QuotationInput } from "@/lib/quotation";
import { linkUsageToQuotation } from "@/lib/aiUsage";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HT-{YYYY}-{MM}-{0001}, running per calendar month, reset to 0001 each new month.
async function nextQuotationNo(tx: Prisma.TransactionClient) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `HT-${yyyy}-${mm}-`;

  const last = await tx.quotation.findFirst({
    where: { quotationNo: { startsWith: prefix } },
    orderBy: { quotationNo: "desc" },
    select: { quotationNo: true },
  });
  const lastSeq = last ? parseInt(last.quotationNo.slice(prefix.length), 10) || 0 : 0;
  const nextSeq = String(lastSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

// GET /api/quotations → list (newest first)
export async function GET() {
  try {
    const rows = await prisma.quotation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        quotationNo: true,
        status: true,
        customerName: true,
        licensePlate: true,
        vehicleBrand: true,
        insurerName: true,
        claimNo: true,
        totalQuoted: true,
        totalControlled: true,
        totalSaving: true,
        createdByName: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
        branch: { select: { name: true } },
      },
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

    const created = await prisma.$transaction(async (tx) => {
      const quotationNo = body.quotationNo || (await nextQuotationNo(tx));
      return tx.quotation.create({
        data: {
          quotationNo,
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
          includeVat: body.includeVat ?? true,
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
    });

    // The AI scan ran before this quotation existed, so its cost row couldn't be
    // attributed at the time — link it now that we have an id.
    const usageLogId = Number((body as any).usageLogId);
    if (Number.isFinite(usageLogId) && usageLogId > 0) {
      await linkUsageToQuotation(usageLogId, created.id);
    }

    return NextResponse.json({ quotation: created });
  } catch (err) {
    console.error("Create quotation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
