import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const defaultBranch = await prisma.branch.findFirst();
    const defaultRole = await prisma.role.findFirst();

    // Auto-fix any employee missing branchId or roleId
    if (defaultBranch && defaultRole) {
      const empsWithoutBranch = await prisma.employee.findMany({
        where: { OR: [{ branchId: null }, { roleId: null }] },
      });

      for (const emp of empsWithoutBranch) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            branchId: emp.branchId || defaultBranch.id,
            roleId: emp.roleId || defaultRole.id,
          },
        });
      }
    }

    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "asc" },
      include: { branch: true, role: true },
    });

    if (employees.length === 0 && defaultBranch && defaultRole) {
      await prisma.employee.createMany({
        data: [
          { code: "EMP-001", name: "อรรถพล โชคชัย", email: "athaporn@htechnology.com", username: "athaporn", password: "password123", phone: "065-882-8333", branchId: defaultBranch.id, roleId: defaultRole.id, status: "active" },
          { code: "EMP-002", name: "สมชาย ใจดี", email: "somchai@claimthunjai.com", username: "somchai", password: "password123", phone: "081-234-5678", branchId: defaultBranch.id, roleId: defaultRole.id, status: "active" },
        ],
      });
      const result = await prisma.employee.findMany({
        orderBy: { createdAt: "asc" },
        include: { branch: true, role: true },
      });
      return NextResponse.json({ employees: result });
    }

    return NextResponse.json({ employees });
  } catch (err) {
    console.error("GET employees error:", err);
    return NextResponse.json({ employees: [], error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();

    let username = String(body.username || "").trim();
    let password = String(body.password || "").trim();

    if (!code) {
      return NextResponse.json({ error: "กรุณาระบุรหัสพนักงาน" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "กรุณาระบุชื่อ-นามสกุลพนักงาน" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "กรุณาระบุอีเมลพนักงาน" }, { status: 400 });
    }

    if (!username) {
      username = email.split("@")[0] || code.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    if (!password) {
      password = "password123";
    }

    const existingCode = await prisma.employee.findUnique({ where: { code } });
    if (existingCode) {
      return NextResponse.json({ error: `รหัสพนักงาน "${code}" มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    const existingEmail = await prisma.employee.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: `อีเมล "${email}" ถูกใช้งานแล้ว` }, { status: 400 });
    }

    const created = await prisma.employee.create({
      data: {
        code,
        name,
        email,
        username,
        password,
        phone: body.phone?.trim() || null,
        branchId: body.branchId || null,
        roleId: body.roleId || null,
        status: body.status || "active",
      },
      include: { branch: true, role: true },
    });

    await logAudit({
      module: "EMPLOYEE",
      action: "CREATE",
      entityId: created.id,
      entityName: `${created.name} (${created.code})`,
      details: `สร้างข้อมูลพนักงานใหม่: ${created.name} (${created.code})`,
    });

    return NextResponse.json({ employee: created });
  } catch (err) {
    console.error("Create employee error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}
