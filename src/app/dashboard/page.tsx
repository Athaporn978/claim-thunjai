import Link from "next/link";
import { prisma } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const claims = await prisma.claim.findMany({
    include: { insurer: true, reports: true },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: claims.length,
    analyzed: claims.filter((c) => c.status === "analyzed" || c.status === "reviewed").length,
    severe: claims.filter((c) => c.overallSeverity === "severe" || c.overallSeverity === "total_loss").length,
  };

  return <DashboardClient claims={claims.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    policyHolder: c.policyHolder,
    vehicleMake: c.vehicleMake || "",
    vehicleModel: c.vehicleModel || "",
    licensePlate: c.licensePlate || "",
    status: c.status,
    overallSeverity: c.overallSeverity || "minor",
    insurerName: c.insurer.name,
    insurerNameTh: c.insurer.nameTh,
    createdAt: c.createdAt.toISOString(),
    reportCount: c.reports.length,
  }))} stats={stats} />;
}
