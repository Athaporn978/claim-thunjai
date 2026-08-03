import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { branch: true, role: true },
    });

    if (emp) {
      await logAudit({
        module: "EMPLOYEE",
        action: "VIEW",
        entityId: emp.id,
        entityName: `${emp.name} (${emp.code})`,
        details: `เปิดดูรายละเอียดข้อมูลพนักงาน: ${emp.name} (${emp.code})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Audit view error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
