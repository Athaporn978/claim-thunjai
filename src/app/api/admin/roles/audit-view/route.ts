import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (role) {
      await logAudit({
        module: "ROLE",
        action: "VIEW",
        entityId: role.id,
        entityName: `${role.name} (${role.code})`,
        details: `เปิดดูรายละเอียดข้อมูลบทบาท: ${role.name} (${role.code})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Audit view role error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
