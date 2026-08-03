import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.code?.trim() || !body.name?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุรหัสสาขาและชื่อสาขา" }, { status: 400 });
    }

    const updated = await prisma.branch.update({
      where: { id },
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
      action: "UPDATE",
      entityId: updated.id,
      entityName: `${updated.name} (${updated.code})`,
      details: `แก้ไขข้อมูลสาขา: ${updated.name} (${updated.code})`,
    });

    return NextResponse.json({ branch: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const target = await prisma.branch.findUnique({ where: { id } });

    await prisma.branch.delete({ where: { id } });

    if (target) {
      await logAudit({
        module: "BRANCH",
        action: "DELETE",
        entityId: target.id,
        entityName: `${target.name} (${target.code})`,
        details: `ลบสาขา: ${target.name} (${target.code})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}
