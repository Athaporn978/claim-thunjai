import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/workflow-settings
export async function GET() {
  try {
    let settings = await prisma.workflowSetting.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      // Find supervisor / admin roles if any to set as default approver roles
      const defaultRoles = await prisma.role.findMany({
        where: {
          OR: [
            { code: { contains: "ADMIN" } },
            { code: { contains: "SUPERVISOR" } },
            { name: { contains: "หัวหน้า" } },
            { name: { contains: "ผู้จัดการ" } },
          ],
        },
      });

      const approverRoleIds = JSON.stringify(defaultRoles.map((r) => r.id));

      settings = await prisma.workflowSetting.create({
        data: {
          id: "default",
          enabled: true,
          ruleMode: "THRESHOLD",
          thresholdAmount: 50000,
          approverRoleIds,
        },
      });
    }

    let parsedRoleIds: string[] = [];
    try {
      parsedRoleIds = JSON.parse(settings.approverRoleIds || "[]");
    } catch {
      parsedRoleIds = [];
    }

    return NextResponse.json({
      settings: {
        ...settings,
        approverRoleIds: parsedRoleIds,
      },
    });
  } catch (err) {
    console.error("GET workflow settings error:", err);
    return NextResponse.json({ error: "Failed to fetch workflow settings" }, { status: 500 });
  }
}

// POST /api/admin/workflow-settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enabled, ruleMode, thresholdAmount, approverRoleIds } = body;

    const roleIdsJson = Array.isArray(approverRoleIds) ? JSON.stringify(approverRoleIds) : "[]";

    const updated = await prisma.workflowSetting.upsert({
      where: { id: "default" },
      update: {
        enabled: Boolean(enabled),
        ruleMode: String(ruleMode || "THRESHOLD"),
        thresholdAmount: Number(thresholdAmount) || 0,
        approverRoleIds: roleIdsJson,
      },
      create: {
        id: "default",
        enabled: Boolean(enabled),
        ruleMode: String(ruleMode || "THRESHOLD"),
        thresholdAmount: Number(thresholdAmount) || 0,
        approverRoleIds: roleIdsJson,
      },
    });

    // If Direct Approval (Option 3) or Workflow Disabled, auto-approve any pending_approval quotations
    if (!Boolean(enabled) || String(ruleMode) === "DIRECT") {
      await prisma.quotation.updateMany({
        where: { status: "pending_approval" },
        data: { status: "approved" },
      });
    }

    let parsedRoleIds: string[] = [];
    try {
      parsedRoleIds = JSON.parse(updated.approverRoleIds || "[]");
    } catch {
      parsedRoleIds = [];
    }

    const modeText = ruleMode === "ALL" ? "บังคับอนุมัติทุกรายการ" : ruleMode === "THRESHOLD" ? `อนุมัติเฉพาะเคสเกิน ฿${Number(thresholdAmount).toLocaleString()}` : "ปิดการอนุมัติ";
    await logAudit({
      module: "WORKFLOW_SETTING",
      action: "UPDATE",
      entityName: "การตั้งค่า Workflow อนุมัติ",
      details: `อัปเดตการตั้งค่า: ${enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"} (${modeText})`,
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        approverRoleIds: parsedRoleIds,
      },
    });
  } catch (err) {
    console.error("POST workflow settings error:", err);
    return NextResponse.json({ error: "Failed to save workflow settings" }, { status: 500 });
  }
}
