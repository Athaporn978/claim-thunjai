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
      return NextResponse.json({ error: "กรุณาระบุรหัสบทบาทและชื่อบทบาท" }, { status: 400 });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        permissions: body.permissions ? JSON.stringify(body.permissions) : null,
        status: body.status || "active",
      },
    });

    await logAudit({
      module: "ROLE",
      action: "UPDATE",
      entityId: updated.id,
      entityName: `${updated.name} (${updated.code})`,
      details: `แก้ไขข้อมูลบทบาท: ${updated.name} (${updated.code})`,
    });

    return NextResponse.json({ role: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const target = await prisma.role.findUnique({ where: { id } });

    await prisma.role.delete({ where: { id } });

    if (target) {
      await logAudit({
        module: "ROLE",
        action: "DELETE",
        entityId: target.id,
        entityName: `${target.name} (${target.code})`,
        details: `ลบบทบาท: ${target.name} (${target.code})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}
