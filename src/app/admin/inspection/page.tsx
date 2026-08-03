"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

type Case = {
  id: string; caseNo: string; token: string; status: string;
  customer: string; licensePlate: string | null; email: string | null; phone: string | null;
  emailSentAt: string | null; createdAt: string; submittedAt: string | null;
};

const STATUS: Record<string, { th: string; en: string; cls: string }> = {
  pending:    { th: "รอลูกค้าถ่ายรูป", en: "Awaiting customer",  cls: "bg-slate-100 text-slate-600" },
  submitted:  { th: "รอตรวจสอบ",       en: "To review",         cls: "bg-blue-50 text-blue-700" },
  review:     { th: "ต้องตรวจสอบ",     en: "Needs review",      cls: "bg-amber-50 text-amber-700" },
  approved:   { th: "อนุมัติ",          en: "Approved",          cls: "bg-emerald-50 text-emerald-700" },
  rejected:   { th: "ปฏิเสธ",          en: "Rejected",          cls: "bg-red-50 text-red-700" },
};

export default function AdminInspectionListPage() {
  const { lang } = useLang();
  const [rows, setRows] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/inspection").then((r) => r.json()).then((d) => setRows(d.cases || [])).finally(() => setLoading(false));
  }, []);

  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-navy-50 text-[var(--navy-900)] text-xs font-semibold mb-2">
            {lang === "th" ? "Admin · บริษัทประกัน" : "Admin · Insurer"}
          </span>
          <h1 className="text-3xl font-bold text-[var(--navy-900)]">
            {lang === "th" ? "ตรวจสภาพ ต่อกรมธรรม์" : "Renewal Inspections"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {lang === "th"
              ? "สร้างเคสให้ลูกค้า → ส่งลิงก์ทางอีเมล → ลูกค้าถ่ายรูปเอง → Admin ตรวจ"
              : "Create a case → email a link → customer captures on mobile → admin reviews"}
          </p>
        </div>
        <Link href="/admin/inspection/new" className="btn-primary text-sm !py-2">+ {lang === "th" ? "สร้างเคสใหม่" : "New case"}</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS).map(([k, s]) => (
          <div key={k} className="card !p-4">
            <div className="text-xs text-slate-500 font-semibold">{lang === "th" ? s.th : s.en}</div>
            <div className="text-3xl font-bold text-[var(--navy-900)] mt-1">{counts[k] || 0}</div>
          </div>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="text-left px-5 py-3">{lang === "th" ? "เลขที่" : "No."}</th>
                <th className="text-left px-5 py-3">{lang === "th" ? "ลูกค้า / ทะเบียน" : "Customer / Plate"}</th>
                <th className="text-left px-5 py-3">{lang === "th" ? "อีเมล" : "Email"}</th>
                <th className="text-center px-5 py-3">{lang === "th" ? "ส่งลิงก์" : "Link sent"}</th>
                <th className="text-center px-5 py-3">{lang === "th" ? "ลูกค้าส่ง" : "Submitted"}</th>
                <th className="text-center px-5 py-3">{lang === "th" ? "สถานะ" : "Status"}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  {lang === "th" ? "ยังไม่มีเคส — กด “สร้างเคสใหม่”" : "No cases yet — click “New case”"}
                </td></tr>
              ) : rows.map((c) => {
                const st = STATUS[c.status] || STATUS.pending;
                const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString(lang === "th" ? "th-TH" : "en-US") : "—";
                return (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[var(--navy-900)]">{c.caseNo}</td>
                    <td className="px-5 py-3"><div className="font-medium">{c.customer}</div><div className="text-xs text-slate-500">{c.licensePlate || "—"}</div></td>
                    <td className="px-5 py-3 text-xs text-slate-600">{c.email || "—"}</td>
                    <td className="px-5 py-3 text-center text-xs">{c.emailSentAt ? "✉︎ " + fmt(c.emailSentAt) : "—"}</td>
                    <td className="px-5 py-3 text-center text-xs">{fmt(c.submittedAt)}</td>
                    <td className="px-5 py-3 text-center"><span className={`${st.cls} px-2 py-0.5 rounded text-xs font-semibold`}>{lang === "th" ? st.th : st.en}</span></td>
                    <td className="px-5 py-3 text-right"><Link href={`/admin/inspection/${c.id}`} className="text-[var(--navy-900)] hover:underline text-xs font-semibold">{lang === "th" ? "ดู →" : "View →"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
