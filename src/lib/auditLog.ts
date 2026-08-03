import { prisma } from "@/lib/db";

export type AuditModule = "BRANCH" | "ROLE" | "EMPLOYEE" | "WORKFLOW_SETTING";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "VIEW";

export async function logAudit({
  module,
  action,
  entityId,
  entityName,
  details,
  performerName = "ผู้ดูแลระบบ (Admin)",
}: {
  module: AuditModule;
  action: AuditAction;
  entityId?: string;
  entityName?: string;
  details?: string;
  performerName?: string;
}) {
  try {
    return await prisma.systemAuditLog.create({
      data: {
        module,
        action,
        entityId,
        entityName,
        details,
        performerName,
      },
    });
  } catch (err) {
    console.error("Failed to record system audit log:", err);
    return null;
  }
}
