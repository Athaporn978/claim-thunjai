import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/audit-logs?module=BRANCH
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");

    const where = module ? { module } : {};

    const logs = await prisma.systemAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("GET audit logs error:", err);
    return NextResponse.json({ logs: [], error: String(err) }, { status: 500 });
  }
}
