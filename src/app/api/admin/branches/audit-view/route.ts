import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branchId } = body;

    if (!branchId) {
      return NextResponse.json({ error: "Missing branchId" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (branch) {
      await logAudit({
        module: "BRANCH",
        action: "VIEW",
        entityId: branch.id,
        entityName: `${branch.name} (${branch.code})`,
        details: `เปิดดูรายละเอียดข้อมูลสาขา: ${branch.name} (${branch.code})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Audit view branch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
