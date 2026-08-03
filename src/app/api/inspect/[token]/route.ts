import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

// Customer opens the invite link; return the minimal case info needed to render
// the mobile capture UI. Never returns admin-only fields.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const c = await prisma.inspectionCase.findUnique({ where: { token } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    case: {
      caseNo: c.caseNo,
      customer: c.customer,
      licensePlate: c.licensePlate,
      status: c.status,
      submittedAt: c.submittedAt,
    },
  });
}
