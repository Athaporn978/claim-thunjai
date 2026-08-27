import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { ids, unarchive } = (await req.json()) as { ids: string[]; unarchive?: boolean };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }
    const { count } = await prisma.quotation.updateMany({
      where: { id: { in: ids } },
      data: { isArchived: !unarchive },
    });
    return NextResponse.json({ updated: count, isArchived: !unarchive });
  } catch (err) {
    console.error("bulk-archive error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
