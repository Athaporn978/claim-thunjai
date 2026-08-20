import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { employees: true } } },
    });

    if (roles.length === 0) {
      await prisma.role.createMany({
        data: [
          { code: "ROLE-ADMIN", name: "Super Administrator", description: "บทบาทสูงสุดสำหรับผู้ดูแลระบบ จัดการได้ทุกเมนู", permissions: JSON.stringify(["all"]) },
          { code: "ROLE-CONTROLLER", name: "เจ้าหน้าที่คุมราคา (Adjuster)", description: "บทบาทตรวจสอบ อนุมัติ และปรับราคาหลังคุมใบเสนอราคาซ่อม", permissions: JSON.stringify(["quotation_review", "catalog_view"]) },
          { code: "ROLE-CENTER", name: "เจ้าหน้าที่ศูนย์บริการ/อู่", description: "บทบาทอัปโหลดเอกสารใบเสนอราคาและเสนอราคาซ่อม", permissions: JSON.stringify(["quotation_create"]) },
          { code: "ROLE-VIEWER", name: "ผู้ดูรายงาน (Viewer)", description: "บทบาทเข้าดูรายงานและสรุปยอดประหยัด (Read Only)", permissions: JSON.stringify(["reports_read"]) },
        ],
      });
      const result = await prisma.role.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { employees: true } } },
      });
      return NextResponse.json({ roles: result });
    }

    return NextResponse.json({ roles });
  } catch (err) {
    console.error("GET roles error:", err);
    return NextResponse.json({ roles: [], error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุรหัสบทบาท" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุชื่อบทบาท" }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { code: body.code.trim() } });
    if (existing) {
      return NextResponse.json({ error: `รหัสบทบาท "${body.code}" มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    const created = await prisma.role.create({
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
      action: "CREATE",
      entityId: created.id,
      entityName: `${created.name} (${created.code})`,
      details: `สร้างบทบาทใหม่: ${created.name} (${created.code})`,
    });

    return NextResponse.json({ role: created });
  } catch (err) {
    console.error("Create role error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}
