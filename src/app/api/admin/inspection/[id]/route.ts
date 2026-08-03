import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await prisma.inspectionCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ case: c });
}

// Admin marks approved / rejected + optional note.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as { status?: "approved" | "rejected"; reviewNote?: string };
  const data: Record<string, unknown> = { reviewedAt: new Date() };
  if (body.status) data.status = body.status;
  if (body.reviewNote !== undefined) data.reviewNote = body.reviewNote;
  const updated = await prisma.inspectionCase.update({ where: { id }, data });
  return NextResponse.json({ case: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.inspectionCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
