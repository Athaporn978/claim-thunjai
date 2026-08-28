import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { totals, type QuotationInput } from "@/lib/quotation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ quotation: q });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = (await req.json()) as QuotationInput & { _editorName?: string; _editorRole?: string };
    const t = totals(body.items || []);

    // Snapshot before for change summary
    const before = await prisma.quotation.findUnique({
      where: { id },
      select: { totalQuoted: true, totalControlled: true, totalSaving: true, customerName: true, licensePlate: true },
    });

    // Replace items wholesale (simplest reliable upsert for a small list)
    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    // Load Workflow Settings to determine status
    const wfSetting = await prisma.workflowSetting.findUnique({ where: { id: "default" } });
    const isWfDisabled = !wfSetting || wfSetting.enabled === false || wfSetting.ruleMode === "DIRECT";
    let targetStatus = body.status;
    if (isWfDisabled) {
      targetStatus = "approved";
    } else if (body.status === "completed") {
      targetStatus = "pending_approval";
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: targetStatus ?? undefined,
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
        officerComment: body.officerComment ?? null,
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

    // Build a human-readable change summary
    const changes: string[] = [];
    if (before) {
      const fmt = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (Math.abs((before.totalQuoted ?? 0) - t.totalQuoted) > 0.01)
        changes.push(`ราคาเสนอรวม: ${fmt(before.totalQuoted ?? 0)} → ${fmt(t.totalQuoted)} บาท`);
      if (Math.abs((before.totalControlled ?? 0) - t.totalControlled) > 0.01)
        changes.push(`ราคาควบคุม: ${fmt(before.totalControlled ?? 0)} → ${fmt(t.totalControlled)} บาท`);
      if ((before.customerName ?? "") !== (body.customerName ?? ""))
        changes.push(`ชื่อลูกค้า: "${before.customerName ?? "-"}" → "${body.customerName ?? "-"}"`);
      if ((before.licensePlate ?? "") !== (body.licensePlate ?? ""))
        changes.push(`ทะเบียน: ${before.licensePlate ?? "-"} → ${body.licensePlate ?? "-"}`);
    }
    changes.push(`รายการซ่อม ${(body.items || []).length} รายการ`);

    await prisma.quotationLog.create({
      data: {
        quotationId: id,
        authorName: body._editorName || "เจ้าหน้าที่",
        authorRole: body._editorRole || "",
        action: "EDITED",
        comment: changes.join(" | "),
      },
    });

    return NextResponse.json({ quotation: updated });
  } catch (err) {
    console.error("Update quotation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
