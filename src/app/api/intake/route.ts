import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeImages, extractIntakeFields } from "@/lib/damageAnalysis";
import { preFilter } from "@/lib/mailFilter";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Mandatory fields — all must be present to be accepted as a valid claim intake.
const REQUIRED = ["customer", "licensePlate", "vehicleMake", "claimNumber"];

type Body = {
  fromEmail?: string;
  subject?: string;
  emailBody?: string;
  images?: { data: string; mediaType: string }[];
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "active";
  const where = view === "junk" ? { status: "junk" } : { status: { not: "junk" } };
  const rows = await prisma.intake.findMany({ where, orderBy: { createdAt: "desc" } });
  const junkCount = await prisma.intake.count({ where: { status: "junk" } });
  return NextResponse.json({ intakes: rows, junkCount });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    // Pre-filter noise (LINE MAN, notifications, OTP)
    const filter = preFilter(body.fromEmail, body.subject);
    if (filter.skip) {
      return NextResponse.json({ skipped: true, reason: filter.reason });
    }

    const intakeNo = `INT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    // Run AI: extract fields from body + analyze photos, in parallel.
    const [fields, analysis] = await Promise.all([
      extractIntakeFields(body.emailBody || "", body.images),
      (body.images && body.images.length)
        ? analyzeImages(body.images, {})
        : Promise.resolve({ results: [] as Record<string, unknown>[], overallSeverity: "minor" as const }),
    ]);

    const num = (v: string | null | undefined) => {
      const n = v ? parseInt(String(v).replace(/\D/g, ""), 10) : NaN;
      return Number.isFinite(n) ? n : null;
    };

    const missing = REQUIRED.filter((f) => !(fields as Record<string, unknown>)[f]);

    // Mandatory Rule: If missing ANY mandatory field, drop/delete it immediately. Do not save to DB!
    if (missing.length > 0) {
      console.log(`Intake skipped (missing mandatory fields: ${missing.join(", ")}):`, body.subject);
      return NextResponse.json({ skipped: true, reason: `missing_mandatory_fields (${missing.join(",")})`, missing });
    }

    let damageCount = 0, totalLow = 0, totalHigh = 0;
    for (const r of analysis.results) {
      const d = (r?.damages as unknown[]) || [];
      damageCount += d.length;
      const te = r?.totalEstimate as { low?: number; high?: number } | undefined;
      totalLow += te?.low || 0;
      totalHigh += te?.high || 0;
    }

    const created = await prisma.intake.create({
      data: {
        intakeNo,
        fromEmail: body.fromEmail || null,
        subject: body.subject || null,
        emailBody: body.emailBody || null,
        status: "completed",
        customer: fields.customer || null,
        licensePlate: fields.licensePlate || null,
        vehicleMake: fields.vehicleMake || null,
        vehicleModel: fields.vehicleModel || null,
        vehicleYear: num(fields.vehicleYear),
        claimNumber: fields.claimNumber || null,
        policyNo: fields.policyNo || null,
        insurer: fields.insurer || null,
        centerName: fields.centerName || null,
        centerContact: fields.centerContact || null,
        photos: body.images?.length ? JSON.stringify(body.images.map((i) => ({ url: `data:${i.mediaType};base64,${i.data}` }))) : null,
        analysis: JSON.stringify({ results: analysis.results, overallSeverity: analysis.overallSeverity, damageCount, totalLow, totalHigh }),
        missing: JSON.stringify(missing),
      },
    });

    return NextResponse.json({ intake: created });
  } catch (err) {
    console.error("Intake error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
