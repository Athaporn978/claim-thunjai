import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Price charged to the customer per successful scan (THB, excl. VAT). This is
 * the invoice figure, not our cost — cost stays in ApiUsageLog. Failed scans
 * are free, so their amount is 0.
 */
const PRICE_PER_SUCCESSFUL_SCAN_THB = 50;

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
        pageCount: true,
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
      rows: rows.map((r) => ({ ...r, amountThb: r.success ? PRICE_PER_SUCCESSFUL_SCAN_THB : 0 })),
      summary: {
        total: rows.length,
        billable,
        failed: rows.length - billable,
        // Raw page total for the operator's own analysis — no cost implied.
        totalPages: rows.reduce((sum, r) => sum + (r.pageCount || 0), 0),
        // Invoice total (THB, excl. VAT): the customer-facing price, not our cost.
        totalAmountThb: billable * PRICE_PER_SUCCESSFUL_SCAN_THB,
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
