import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED = ["customer", "licensePlate", "vehicleMake", "claimNumber"];
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const intake = await prisma.intake.findUnique({ where: { id } });
  if (!intake) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ intake });
}

// Staff edits fields → recompute missing/status; or set status directly.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, string | number | null>;

  const editable = ["customer", "licensePlate", "vehicleMake", "vehicleModel", "claimNumber", "policyNo", "insurer", "centerName", "centerContact"];
  const data: Record<string, unknown> = {};
  for (const k of editable) if (k in body) data[k] = body[k] ?? null;
  if ("vehicleYear" in body) data.vehicleYear = body.vehicleYear ? Number(body.vehicleYear) : null;

  const current = await prisma.intake.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merged = { ...current, ...data } as Record<string, unknown>;
  const missing = REQUIRED.filter((f) => !merged[f]);
  data.missing = JSON.stringify(missing);
  if (body.status) data.status = body.status;
  else data.status = missing.length > 0 ? "needs_info" : "completed";

  const updated = await prisma.intake.update({ where: { id }, data });
  return NextResponse.json({ intake: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.intake.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
