import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const code = String(body.code || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!code || !name || !email) {
      return NextResponse.json({ error: "กรุณาระบุรหัส, ชื่อ-นามสกุล และอีเมล" }, { status: 400 });
    }

    const updateData: {
      code: string;
      name: string;
      email: string;
      username?: string | null;
      password?: string;
      phone: string | null;
      branchId: string | null;
      roleId: string | null;
      status: string;
    } = {
      code,
      name,
      email,
      phone: body.phone?.trim() || null,
      branchId: body.branchId || null,
      roleId: body.roleId || null,
      status: body.status || "active",
    };

    if (username) updateData.username = username;
    if (password) updateData.password = password;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: { branch: true, role: true },
    });

    await logAudit({
      module: "EMPLOYEE",
      action: "UPDATE",
      entityId: updated.id,
      entityName: `${updated.name} (${updated.code})`,
      details: `แก้ไขข้อมูลพนักงาน: ${updated.name} (${updated.code}) ${username ? `Username: ${username}` : ""}`,
    });

    return NextResponse.json({ employee: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const target = await prisma.employee.findUnique({ where: { id } });

    await prisma.employee.delete({ where: { id } });

    if (target) {
      await logAudit({
        module: "EMPLOYEE",
        action: "DELETE",
        entityId: target.id,
        entityName: `${target.name} (${target.code})`,
        details: `ลบพนักงาน: ${target.name} (${target.code})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}
