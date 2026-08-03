"use client";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

type ClaimRow = {
  id: string;
  claimNumber: string;
  policyHolder: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  status: string;
  overallSeverity: string;
  insurerName: string;
  insurerNameTh: string;
  createdAt: string;
  reportCount: number;
};

const sevClass: Record<string, string> = {
  minor: "badge-minor",
  moderate: "badge-moderate",
  severe: "badge-severe",
  total_loss: "badge-total",
};
const statusClass: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  analyzed: "bg-blue-50 text-blue-700",
  reviewed: "bg-purple-50 text-purple-700",
  closed: "bg-emerald-50 text-emerald-700",
};

export function DashboardClient({
  claims,
  stats,
}: {
  claims: ClaimRow[];
  stats: { total: number; analyzed: number; severe: number };
}) {
  const { t, lang } = useLang();
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--navy-900)]">{t.dashboard.title}</h1>
          <p className="text-slate-600 mt-1 text-sm">{lang === "th" ? "ภาพรวมเคลมทั้งหมดในระบบ" : "Overview of all claims in the system"}</p>
        </div>
        <Link href="/analyze" className="btn-primary text-sm !py-2 !px-4">{t.dashboard.newClaim}</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t.dashboard.total, value: stats.total, color: "text-[var(--navy-900)]" },
          { label: t.dashboard.analyzed, value: stats.analyzed, color: "text-blue-600" },
          { label: t.dashboard.severe, value: stats.severe, color: "text-red-600" },
          { label: t.dashboard.avgTime, value: "4.2s", color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="card !p-5">
            <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
            <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-[var(--navy-900)]">{t.dashboard.recent}</h2>
          <span className="text-xs text-slate-500">{claims.length} {lang === "th" ? "เคลม" : "claims"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="text-left px-6 py-3">{lang === "th" ? "เลขเคลม" : "Claim #"}</th>
                <th className="text-left px-6 py-3">{lang === "th" ? "ผู้เอาประกัน" : "Policy Holder"}</th>
                <th className="text-left px-6 py-3">{lang === "th" ? "บริษัทประกัน" : "Insurer"}</th>
                <th className="text-left px-6 py-3">{lang === "th" ? "รถ" : "Vehicle"}</th>
                <th className="text-left px-6 py-3">{t.dashboard.status}</th>
                <th className="text-left px-6 py-3">{lang === "th" ? "ระดับ" : "Severity"}</th>
                <th className="text-left px-6 py-3">{lang === "th" ? "ภาพ" : "Photos"}</th>
                <th className="text-left px-6 py-3">{lang === "th" ? "วันที่" : "Date"}</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">{lang === "th" ? "ยังไม่มีเคลม" : "No claims yet"}</td></tr>
              ) : (
                claims.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-[var(--navy-900)]">{c.claimNumber}</td>
                    <td className="px-6 py-3">{c.policyHolder}</td>
                    <td className="px-6 py-3 text-slate-600 text-xs">{lang === "th" ? c.insurerNameTh : c.insurerName}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{c.vehicleMake} {c.vehicleModel}</div>
                      <div className="text-xs text-slate-500">{c.licensePlate}</div>
                    </td>
                    <td className="px-6 py-3"><span className={`${statusClass[c.status]} px-2 py-0.5 rounded text-xs font-semibold`}>{c.status}</span></td>
                    <td className="px-6 py-3"><span className={`${sevClass[c.overallSeverity]} px-2 py-0.5 rounded text-xs font-bold`}>{t.severity[c.overallSeverity as keyof typeof t.severity] || c.overallSeverity}</span></td>
                    <td className="px-6 py-3 text-slate-600">{c.reportCount}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-US")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
