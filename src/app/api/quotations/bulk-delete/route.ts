import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }
    const { count } = await prisma.quotation.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ deleted: count });
  } catch (err) {
    console.error("bulk-delete error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
