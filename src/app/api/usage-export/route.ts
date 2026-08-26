import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only feed of AI usage rows for an external monitoring dashboard.
 *
 * Authenticated by a dedicated shared secret rather than an employee session,
 * because the caller is another machine, not a person with a browser. That
 * means this route is listed in proxy.ts's PUBLIC_API_PATHS and is responsible
 * for its own auth — it must fail closed.
 *
 * Cursor-based on the auto-increment id: pass the last id you received as
 * `since` and you get everything after it, exactly once, with no reliance on
 * clocks agreeing between machines.
 */

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.USAGE_EXPORT_SECRET;
  // Fail closed: an unset secret disables the endpoint rather than opening it.
  if (!expected) return false;

  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so check length first — the
  // length of a secret is not itself sensitive.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const since = Number(searchParams.get("since") ?? 0);
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);

  if (!Number.isFinite(since) || since < 0) {
    return NextResponse.json({ error: "Invalid 'since'" }, { status: 400 });
  }
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  try {
    const rows = await prisma.apiUsageLog.findMany({
      where: { id: { gt: Math.trunc(since) } },
      orderBy: { id: "asc" },
      take: limit,
      // Explicit select, never a bare findMany: this response leaves the server,
      // so the shape has to be a deliberate allow-list of counts and metadata.
      // No prompt text, no model output, no customer or vehicle data.
      //
      // userEmail and errorMessage are held back on purpose — the first is staff
      // PII the dashboard doesn't need (branchName/tenantId already give the
      // attribution), the second can echo fragments of an upstream error. Both
      // stay queryable in the database itself if they're ever needed.
      select: {
        id: true,
        appName: true,
        route: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheCreationTokens: true,
        costUsd: true,
        success: true,
        stopReason: true,
        durationMs: true,
        quotationId: true,
        branchName: true,
        tenantId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      rows,
      count: rows.length,
      // Feed this back as `since` on the next call. Null when nothing new.
      nextCursor: rows.length ? rows[rows.length - 1].id : null,
      // A full page means there may be more waiting — keep pulling.
      hasMore: rows.length === limit,
    });
  } catch (err) {
    console.error("usage-export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
