import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quotations/[id]/reject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const authorName = body.authorName || "Supervisor";
    const authorRole = body.authorRole || "หัวหน้างาน";
    const comment = String(body.comment || "").trim();

    if (!comment) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลในการตีกลับเอกสาร" }, { status: 400 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: "ไม่พบใบเสนอราคาที่ต้องการตีกลับ" }, { status: 404 });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: "rejected",
      },
    });

    await prisma.quotationLog.create({
      data: {
        quotationId: id,
        authorName,
        authorRole,
        action: "REJECTED",
        comment: `❌ ตีกลับแก้ไข: ${comment}`,
      },
    });

    return NextResponse.json({
      success: true,
      quotation: updated,
      message: "ตีกลับเอกสารให้พนักงานแก้ไขเรียบร้อยแล้ว",
    });
  } catch (err) {
    console.error("Reject quotation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตีกลับ" }, { status: 500 });
  }
}
