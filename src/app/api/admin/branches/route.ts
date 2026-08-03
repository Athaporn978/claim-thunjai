import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { employees: true } } },
    });

    if (branches.length === 0) {
      await prisma.branch.createMany({
        data: [
          { code: "BR-01", name: "สำนักงานใหญ่ (กรุงเทพมหานคร)", address: "888 ถนนสุขุมวิท คลองเตย กรุงเทพฯ 10110", phone: "02-123-4567" },
          { code: "BR-02", name: "สาขาเชียงใหม่ (ภาคเหนือ)", address: "123 ถนนซูเปอร์ไฮเวย์ เมือง เชียงใหม่ 50000", phone: "053-987-654" },
          { code: "BR-03", name: "สาขาภูเก็ต (ภาคใต้)", address: "456 ถนนเทพกระษัตรี เมือง ภูเก็ต 83000", phone: "076-543-210" },
        ],
      });
      const result = await prisma.branch.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { employees: true } } },
      });
      return NextResponse.json({ branches: result });
    }

    return NextResponse.json({ branches });
  } catch (err) {
    console.error("GET branches error:", err);
    return NextResponse.json({ branches: [], error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุรหัสสาขา" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุชื่อสาขา" }, { status: 400 });
    }

    // Check unique code
    const existing = await prisma.branch.findUnique({ where: { code: body.code.trim() } });
    if (existing) {
      return NextResponse.json({ error: `รหัสสาขา "${body.code}" มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    const created = await prisma.branch.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        status: body.status || "active",
      },
    });

    await logAudit({
      module: "BRANCH",
      action: "CREATE",
      entityId: created.id,
      entityName: `${created.name} (${created.code})`,
      details: `สร้างสาขาใหม่: ${created.name} (${created.code})`,
    });

    return NextResponse.json({ branch: created });
  } catch (err) {
    console.error("Create branch error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}
