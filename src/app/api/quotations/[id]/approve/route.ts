import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quotations/[id]/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const authorName = body.authorName || "Supervisor";
    const authorRole = body.authorRole || "หัวหน้างาน";
    const comment = body.comment || "อนุมัติคุมราคาเรียบร้อยแล้ว";

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: "ไม่พบใบเสนอราคาที่ต้องการอนุมัติ" }, { status: 404 });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: authorName,
      },
    });

    await prisma.quotationLog.create({
      data: {
        quotationId: id,
        authorName,
        authorRole,
        action: "APPROVED",
        comment,
      },
    });

    return NextResponse.json({
      success: true,
      quotation: updated,
      message: "อนุมัติใบเสนอราคาเรียบร้อยแล้ว",
    });
  } catch (err) {
    console.error("Approve quotation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอนุมัติ" }, { status: 500 });
  }
}
