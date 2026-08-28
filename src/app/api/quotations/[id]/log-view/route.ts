import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quotations/[id]/log-view
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const authorName = body.authorName || "ผู้ใช้งาน";
    const authorRole = body.authorRole || "";

    const exists = await prisma.quotation.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false }, { status: 404 });

    await prisma.quotationLog.create({
      data: {
        quotationId: id,
        authorName,
        authorRole,
        action: "VIEW",
        comment: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("log-view error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
