import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isSystemOwner } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Price charged to the customer per successful scan (THB, excl. VAT). This is
 * the invoice figure, not our cost — cost stays in ApiUsageLog. Failed scans
 * are free, so their amount is 0.
 */
const PRICE_PER_SUCCESSFUL_SCAN_THB = 50;

/** Cost rows are in USD; profit is reported in THB. Set USD_TO_THB in .env. */
function usdToThb(): number {
  const v = Number(process.env.USD_TO_THB);
  return Number.isFinite(v) && v > 0 ? v : 36;
}

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
        apiUsageLogId: true,
      },
    });

    const billable = rows.filter((r) => r.success).length;
    const priced = rows.map(({ apiUsageLogId, ...r }) => ({
      ...r,
      amountThb: r.success ? PRICE_PER_SUCCESSFUL_SCAN_THB : 0,
      _usageId: apiUsageLogId,
    }));
    const summary = {
      total: rows.length,
      billable,
      failed: rows.length - billable,
      // Raw page total for the operator's own analysis — no cost implied.
      totalPages: rows.reduce((sum, r) => sum + (r.pageCount || 0), 0),
      // Invoice total (THB, excl. VAT): the customer-facing price, not our cost.
      totalAmountThb: billable * PRICE_PER_SUCCESSFUL_SCAN_THB,
    };

    // Everyone but the system owner gets exactly this — no cost fields exist in
    // the payload at all, so nothing can leak via devtools or the Excel export.
    const owner = isSystemOwner(await getSession());
    if (!owner) {
      return NextResponse.json({ rows: priced.map(({ _usageId, ...r }) => r), summary });
    }

    const ids = priced.map((r) => r._usageId).filter((id): id is number => typeof id === "number");
    const usage = ids.length
      ? await prisma.apiUsageLog.findMany({ where: { id: { in: ids } }, select: { id: true, costUsd: true, model: true } })
      : [];
    const byId = new Map(usage.map((u) => [u.id, u]));
    const rate = usdToThb();

    const ownerRows = priced.map(({ _usageId, ...r }) => {
      const u = _usageId != null ? byId.get(_usageId) : undefined;
      const costUsd = u?.costUsd ?? 0;
      const costThb = costUsd * rate;
      return { ...r, aiUsed: !!u, model: u?.model ?? null, costUsd, costThb, profitThb: r.amountThb - costThb };
    });
    const totalCostUsd = ownerRows.reduce((s, r) => s + r.costUsd, 0);
    const totalCostThb = totalCostUsd * rate;
    const totalProfitThb = summary.totalAmountThb - totalCostThb;

    return NextResponse.json({
      rows: ownerRows,
      summary: {
        ...summary,
        owner: true,
        usdToThb: rate,
        usdToThbNote: process.env.USD_TO_THB_NOTE || null,
        totalCostUsd,
        totalCostThb,
        totalProfitThb,
        marginPct: summary.totalAmountThb > 0 ? (totalProfitThb / summary.totalAmountThb) * 100 : 0,
        noAiScans: ownerRows.filter((r) => !r.aiUsed).length,
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
