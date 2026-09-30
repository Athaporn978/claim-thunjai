import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Billing ledger feed for /reports/upload-transactions.
 *
 * Returns NO cost figures by design — this report is shown to the customer the
 * invoice goes to, and AI spend is our own margin. Cost lives in ApiUsageLog.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const from = sp.get("from");
    const to = sp.get("to");

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
    }

    const rows = await prisma.uploadTransactionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        id: true,
        userName: true,
        userEmail: true,
        branchName: true,
        fileName: true,
        fileCount: true,
        mode: true,
        success: true,
        errorMessage: true,
        itemsFound: true,
        quotationId: true,
        quotationNo: true,
        createdAt: true,
      },
    });

    const billable = rows.filter((r) => r.success).length;

    return NextResponse.json({
      rows,
      summary: {
        total: rows.length,
        billable,
        failed: rows.length - billable,
        // Billable scans that were never saved as a case — the wastage figure.
        discarded: rows.filter((r) => r.success && !r.quotationId).length,
      },
    });
  } catch (err) {
    console.error("upload-transactions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
