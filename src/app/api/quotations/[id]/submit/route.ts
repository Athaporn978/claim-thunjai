import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quotations/[id]/submit
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const authorName = body.authorName || "พนักงานคุมราคา";
    const authorRole = body.authorRole || "พนักงาน";
    const isSupervisor = Boolean(body.isSupervisor);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: "ไม่พบใบเสนอราคาที่ต้องการส่งอนุมัติ" }, { status: 404 });
    }

    // Load Workflow Settings
    let settings = await prisma.workflowSetting.findUnique({
      where: { id: "default" },
    });

    const isWorkflowEnabled = settings?.enabled ?? true;
    const ruleMode = settings?.ruleMode ?? "THRESHOLD";
    const thresholdAmount = settings?.thresholdAmount ?? 50000;

    let requiresApproval = false;

    if (isSupervisor) {
      // Supervisor executing directly -> Auto Approve!
      requiresApproval = false;
    } else if (!isWorkflowEnabled || ruleMode === "DIRECT") {
      requiresApproval = false;
    } else if (ruleMode === "ALL") {
      requiresApproval = true;
    } else if (ruleMode === "THRESHOLD") {
      // Require approval if controlled amount > threshold X
      if ((quotation.totalControlled || 0) > thresholdAmount) {
        requiresApproval = true;
      }
    }

    const newStatus = requiresApproval ? "pending_approval" : "approved";

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: newStatus,
        approvedAt: newStatus === "approved" ? new Date() : null,
        approvedBy: newStatus === "approved" ? authorName : null,
      },
    });

    // Create Audit Log
    const logComment = requiresApproval
      ? `ส่งขออนุมัติ Supervisor (ยอดคุมราคา ฿${(quotation.totalControlled || 0).toLocaleString()} เกณฑ์ ฿${thresholdAmount.toLocaleString()})`
      : isSupervisor
      ? `คุมราคาและอนุมัติเสร็จสิ้นโดย Supervisor`
      : `อนุมัติเสร็จสิ้นตามเงื่อนไข (ยอดไม่เกินเกณฑ์กำหนด ฿${thresholdAmount.toLocaleString()})`;

    await prisma.quotationLog.create({
      data: {
        quotationId: id,
        authorName,
        authorRole,
        action: requiresApproval ? "SUBMITTED" : "APPROVED",
        comment: logComment,
      },
    });

    return NextResponse.json({
      success: true,
      quotation: updated,
      requiresApproval,
      message: requiresApproval ? "ส่งเสนอ Supervisor อนุมัติเรียบร้อยแล้ว" : "อนุมัติคุมราคาเรียบร้อยแล้ว",
    });
  } catch (err) {
    console.error("Submit quotation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งอนุมัติ" }, { status: 500 });
  }
}
