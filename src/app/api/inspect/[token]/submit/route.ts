import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 90;
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

type Shot = { data: string; mediaType: string };

// Customer submits all shots — we persist them and run the AI validator
// (delegated to /api/inspection-validate). Result decides pending → submitted (passed) or review.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params;
    const found = await prisma.inspectionCase.findUnique({ where: { token } });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (found.status !== "pending") {
      return NextResponse.json({ error: "already submitted", status: found.status }, { status: 409 });
    }

    const body = (await req.json()) as {
      angles?: Record<string, Shot>;
      docs?: Record<string, Shot>;
    };
    const angles = body.angles || {};
    const docs = body.docs || {};

    // Delegate validation to the existing endpoint
    const origin = new URL(req.url).origin;
    const vRes = await fetch(`${origin}/api/inspection-validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angles, docs }),
    });
    const validation = await vRes.json();

    // Store as data-URL map for the admin review page.
    const toUrlMap = (m: Record<string, Shot>) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(m)) out[k] = `data:${v.mediaType};base64,${v.data}`;
      return out;
    };

    const status = validation.status === "passed" ? "submitted" : "review";
    const updated = await prisma.inspectionCase.update({
      where: { token },
      data: {
        shots: JSON.stringify({ angles: toUrlMap(angles), docs: toUrlMap(docs) }),
        validation: JSON.stringify(validation),
        status,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, status: updated.status, validation });
  } catch (err) {
    console.error("Inspect submit error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
