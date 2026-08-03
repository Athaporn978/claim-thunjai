import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const whereClause: any = {
      module: "PRICE_CATALOG",
      action: "BULK_IMPORT",
    };

    // Filter by Date Range if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const logs = await prisma.systemAuditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const parsedLogs = logs.map((log) => {
      let detailsObj: any = {};
      try {
        detailsObj = log.details ? JSON.parse(log.details) : {};
      } catch {
        detailsObj = {};
      }

      // Strip email pattern if present e.g. "Name (email) [Role]" -> "Name [Role]"
      const rawPerformer = log.performerName || "อรรถ ทดสอบ [Super Administrator]";
      const cleanedPerformer = rawPerformer.replace(/\s*\([^)]+@\S+\)/g, "");

      let rawType = detailsObj.importType || (log.entityId === "labor" ? "ราคาค่าแรง" : "ราคาค่าอะไหล่");
      if (rawType.includes("ค่าแรง")) rawType = "ราคาค่าแรง";
      if (rawType.includes("อะไหล่")) rawType = "ราคาค่าอะไหล่";

      return {
        id: log.id,
        filename: log.entityName || detailsObj.filename || "bulk_price_import.xlsx",
        importType: rawType,
        totalUploaded: detailsObj.totalUploaded || 0,
        successCount: detailsObj.successCount || 0,
        failedCount: detailsObj.failedCount || 0,
        performerName: cleanedPerformer,
        createdAt: log.createdAt,
      };
    });

    // Client-side / JS search filtering for performerName, filename, importType
    const filteredLogs = parsedLogs.filter((log) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        log.filename.toLowerCase().includes(q) ||
        log.performerName.toLowerCase().includes(q) ||
        log.importType.toLowerCase().includes(q)
      );
    });

    return NextResponse.json({ success: true, logs: filteredLogs });
  } catch (error: any) {
    console.error("Fetch bulk import logs failed:", error);
    return NextResponse.json({ success: false, error: error.message || "เกิดข้อผิดพลาดในการดึง Audit Log" }, { status: 500 });
  }
}
