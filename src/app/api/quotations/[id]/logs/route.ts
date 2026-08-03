import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quotations/[id]/logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await prisma.quotationLog.findMany({
      where: { quotationId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("GET quotation logs error:", err);
    return NextResponse.json({ logs: [], error: String(err) }, { status: 500 });
  }
}
