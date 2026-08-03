import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendMail, inspectionInviteEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/inspection → list all cases (newest first)
export async function GET() {
  const rows = await prisma.inspectionCase.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ cases: rows });
}

// POST /api/admin/inspection → create a new case + email the customer.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      customer: string; licensePlate?: string; email: string; phone?: string;
      deliveryChannel?: "email" | "sms";
    };
    if (!body.customer?.trim()) return NextResponse.json({ error: "customer required" }, { status: 400 });
    if (!body.licensePlate?.trim()) return NextResponse.json({ error: "licensePlate required" }, { status: 400 });
    if (!body.email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

    const caseNo = `INSP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const token = randomBytes(18).toString("base64url");

    const created = await prisma.inspectionCase.create({
      data: {
        caseNo, token, status: "pending",
        customer: body.customer.trim(),
        licensePlate: body.licensePlate?.trim() || null,
        email: body.email.trim(),
        phone: body.phone?.trim() || null,
        deliveryChannel: body.deliveryChannel || "email",
      },
    });

    // Build absolute link back to the customer page
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3015";
    const link = `${proto}://${host}/inspect/${token}`;

    let deliveryResult: { sent: boolean; mocked?: boolean; error?: string } = { sent: false };
    let finalCase = created;
    if (body.email) {
      const mail = inspectionInviteEmail({ customer: created.customer, link, licensePlate: created.licensePlate || undefined });
      deliveryResult = await sendMail({ to: created.email!, ...mail });
      // Only stamp emailSentAt if the mail was actually delivered by the provider.
      // A mocked send (no API key) or an error stays un-stamped so the admin
      // knows to share the link manually via the copy-fallback UI.
      if (deliveryResult.sent) {
        finalCase = await prisma.inspectionCase.update({ where: { id: created.id }, data: { emailSentAt: new Date() } });
      }
    }

    return NextResponse.json({ case: finalCase, link, delivery: deliveryResult });
  } catch (err) {
    console.error("Create inspection error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
