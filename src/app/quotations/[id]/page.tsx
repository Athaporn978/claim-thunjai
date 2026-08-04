"use client";
import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { fmtBaht, lineQuoted, lineControlled, lineSaving, totals, type QuotationItemInput } from "@/lib/quotation";

type Quotation = {
  id: string; quotationNo: string; status: string;
  customerName: string | null; licensePlate: string | null; vehicleCategory: string | null;
  vehicleBrand: string | null; vehicleModel: string | null; vehicleYear: number | null; chassisNo: string | null; color: string | null; mileage: number | null;
  insurerName: string | null; claimNo: string | null; insVehicleType: string | null; policyNo: string | null;
  policyType: string | null; sumInsured: number | null; coverageStart: string | null; coverageEnd: string | null; deductible: number | null;
  centerName: string | null; centerAddress: string | null; centerContact: string | null;
  vehicleSize: string;
  photos: string | null;
  totalQuoted: number;
  totalControlled: number;
  totalSaving: number;
  approvedAt: string | null;
  approvedBy: string | null;
  items: QuotationItemInput[];
};

type LogItem = {
  id: string;
  authorName: string;
  authorRole: string | null;
  action: string;
  comment: string | null;
  createdAt: string;
};

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm text-slate-800 font-medium">{value || "—"}</div>
    </div>
  );
}

function ItemSection({ title, items, lang }: { title: string; items: QuotationItemInput[]; lang: "th" | "en" }) {
  const t = totals(items);
  return (
    <div className="mb-6">
      <h3 className="font-bold text-[var(--navy-900)] mb-2">{title}</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-slate-100 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-3 py-2">{lang === "th" ? "รายการ" : "Item"}</th>
              <th className="text-right px-3 py-2">{lang === "th" ? "เสนอ (รวม)" : "Quoted"}</th>
              <th className="text-right px-3 py-2">{lang === "th" ? "หลังคุม (รวม)" : "Controlled"}</th>
              <th className="text-right px-3 py-2">Saving</th>
              <th className="text-left px-3 py-2">{lang === "th" ? "หมายเหตุ" : "Note"}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-4">—</td></tr>
            ) : items.map((i, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="px-3 py-2">{i.name || "—"}</td>
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                  {fmtBaht(lineQuoted(i), lang)}
                  <span className="text-[10px] text-slate-400 ml-1">({fmtBaht(i.quotedUnit, lang)}×{i.quotedQty})</span>
                </td>
                <td className="px-3 py-2 text-right text-emerald-700 whitespace-nowrap">{fmtBaht(lineControlled(i), lang)}</td>
                <td className="px-3 py-2 text-right font-semibold text-[var(--orange-600)] whitespace-nowrap">{fmtBaht(lineSaving(i), lang)}</td>
                <td className="px-3 py-2 text-slate-500 text-xs">{i.note}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
              <td className="px-3 py-2 text-right text-slate-600">{lang === "th" ? "รวม" : "Total"}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{fmtBaht(t.totalQuoted, lang)}</td>
              <td className="px-3 py-2 text-right text-emerald-700 whitespace-nowrap">{fmtBaht(t.totalControlled, lang)}</td>
              <td className="px-3 py-2 text-right text-[var(--orange-600)] whitespace-nowrap">{fmtBaht(t.totalSaving, lang)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function QuotationReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const [q, setQ] = useState<Quotation | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Workflow State & Actions
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConditionalApproveModal, setShowConditionalApproveModal] = useState(false);
  const [conditionalNote, setConditionalNote] = useState("");
  const [hoveredGarageScore, setHoveredGarageScore] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSupervisorUser, setIsSupervisorUser] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("สมชาย ใจดี");
  const [currentUserRole, setCurrentUserRole] = useState("Supervisor (หัวหน้างาน)");
  const [statusModal, setStatusModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    icon: string;
    badgeBg: string;
    buttonClass: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && q) {
      const userStr = localStorage.getItem("currentUser");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          const roleName = String(u.roleName || u.role?.name || u.role || "").toLowerCase();
          const email = String(u.email || "").toLowerCase();

          const isSuperAdmin =
            email === "athaporn@htechnology.com" ||
            email === "admin@htechnology.com" ||
            roleName === "super administrator" ||
            roleName === "admin";

          const isSupervisor =
            isSuperAdmin ||
            roleName.includes("supervisor") ||
            roleName.includes("หัวหน้า") ||
            roleName.includes("adjuster") ||
            roleName.includes("controller") ||
            roleName.includes("อนุมัติ") ||
            roleName.includes("ผู้พิจารณา");

          const realName = u.name || u.fullName || (email.includes("athaporn") ? "อรรถพร สุขเกษม" : email.includes("admin") ? "ผู้ดูแลระบบ (Super Admin)" : "สมชาย ใจดี");
          const realRole = u.roleName || u.role?.name || (isSuperAdmin ? "Super Administrator" : isSupervisor ? "Supervisor (หัวหน้างาน)" : "เจ้าหน้าที่คุมราคา");

          setCurrentUserName(realName);
          setCurrentUserRole(realRole);
          setIsSupervisorUser(isSupervisor);
        } catch {}
      }
    }
  }, [q]);

  const garageMetrics = useMemo(() => {
    if (!q || !q.centerName) return { score: 100, rate: 0, label: "ยอดเยี่ยม (Excellent)" };
    
    let hash = 0;
    const name = q.centerName;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const score = Math.abs(hash % 50) + 48;
    const rate = Math.abs(hash % 30) + 1;

    let label = "น่าเชื่อถือต่ำ (Needs Review)";
    if (score >= 85) label = "ยอดเยี่ยม (Excellent)";
    else if (score >= 70) label = "ความน่าเชื่อถือดี (Good)";
    else if (score >= 55) label = "ปานกลาง (Fair)";

    return { score, rate, label };
  }, [q]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/quotations/${id}`).then((r) => r.json()),
      fetch(`/api/quotations/${id}/logs`).then((r) => r.json()),
    ])
      .then(([qRes, logRes]) => {
        setQ(qRes.quotation || null);
        setLogs(logRes.logs || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStaffSubmit = async () => {
    if (!q) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: currentUserName,
          authorRole: currentUserRole,
          isSupervisor: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusModal({
          show: true,
          title: "ส่งเรื่องขออนุมัติสำเร็จแล้ว",
          message: data.message || "ระบบได้ส่งเอกสารให้ Supervisor ตรวจพิจารณาเรียบร้อยแล้ว",
          icon: "🚀",
          badgeBg: "bg-blue-50 text-blue-600 border border-blue-200",
          buttonClass: "bg-gradient-to-r from-[#0071e3] to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-blue-500/20",
        });
        loadData();
      } else {
        setStatusModal({
          show: true,
          title: "เกิดข้อผิดพลาด",
          message: data.error || "เกิดข้อผิดพลาดในการส่งอนุมัติ",
          icon: "⚠️",
          badgeBg: "bg-rose-50 text-rose-600 border border-rose-200",
          buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupervisorDirectApprove = async () => {
    if (!q) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: currentUserName,
          authorRole: currentUserRole,
          comment: "✅ อนุมัติคุมราคาเรียบร้อยแล้ว",
        }),
      });
      if (res.ok) {
        setStatusModal({
          show: true,
          title: "อนุมัติคุมราคาสำเร็จแล้ว",
          message: "ระบบได้ทำการอนุมัติใบเสนอราคานี้และบันทึกประวัติเข้าสู่ Audit Log เรียบร้อยแล้ว",
          icon: "✅",
          badgeBg: "bg-emerald-50 text-emerald-600 border border-emerald-200",
          buttonClass: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20",
        });
        loadData();
      } else {
        setStatusModal({
          show: true,
          title: "เกิดข้อผิดพลาด",
          message: "เกิดข้อผิดพลาดในการอนุมัติเอกสาร",
          icon: "⚠️",
          badgeBg: "bg-rose-50 text-rose-600 border border-rose-200",
          buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupervisorConditionalApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionalNote.trim()) {
      setStatusModal({
        show: true,
        title: "กรุณาระบุเงื่อนไข",
        message: "กรุณาระบุข้อความเงื่อนไขการอนุมัติก่อนยืนยัน",
        icon: "⚠️",
        badgeBg: "bg-amber-50 text-amber-600 border border-amber-200",
        buttonClass: "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: currentUserName,
          authorRole: currentUserRole,
          comment: `⚠️ อนุมัติแบบมีเงื่อนไข: ${conditionalNote.trim()}`,
        }),
      });
      if (res.ok) {
        setShowConditionalApproveModal(false);
        setConditionalNote("");
        setStatusModal({
          show: true,
          title: "อนุมัติแบบมีเงื่อนไขสำเร็จแล้ว",
          message: "ระบบได้ทำการบันทึกข้อความเงื่อนไขพร้อมปรับสถานะเป็นอนุมัติเสร็จสิ้นเรียบร้อยแล้ว",
          icon: "⚠️",
          badgeBg: "bg-amber-50 text-amber-600 border border-amber-200",
          buttonClass: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20",
        });
        loadData();
      } else {
        setStatusModal({
          show: true,
          title: "เกิดข้อผิดพลาด",
          message: "เกิดข้อผิดพลาดในการอนุมัติแบบมีเงื่อนไข",
          icon: "⚠️",
          badgeBg: "bg-rose-50 text-rose-600 border border-rose-200",
          buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupervisorReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setStatusModal({
        show: true,
        title: "กรุณาระบุเหตุผล",
        message: "กรุณาระบุเหตุผลในการตีกลับเอกสารก่อนยืนยัน",
        icon: "⚠️",
        badgeBg: "bg-rose-50 text-rose-600 border border-rose-200",
        buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: currentUserName,
          authorRole: currentUserRole,
          comment: rejectReason,
        }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        setRejectReason("");
        setStatusModal({
          show: true,
          title: "ตีกลับเอกสารสำเร็จแล้ว",
          message: "ระบบได้แจ้งเตือนและส่งเอกสารกลับให้เจ้าหน้าที่แก้ไขเรียบร้อยแล้ว",
          icon: "❌",
          badgeBg: "bg-rose-50 text-rose-600 border border-rose-200",
          buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
        });
        loadData();
      } else {
        setStatusModal({
          show: true,
          title: "เกิดข้อผิดพลาด",
          message: "เกิดข้อผิดพลาดในการตีกลับเอกสาร",
          icon: "⚠️",
          badgeBg: "bg-rose-50 text-rose-600 border border-rose-200",
          buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-medium">กำลังโหลดข้อมูล…</div>;
  if (!q) return <div className="p-12 text-center text-slate-400 font-medium">{lang === "th" ? "ไม่พบใบเสนอราคา" : "Not found"}</div>;

  const labor = q.items.filter((i) => i.type === "labor");
  const parts = q.items.filter((i) => i.type === "part");
  const t = totals(q.items);
  let photos: { url: string; caption?: string }[] = [];
  try { photos = q.photos ? JSON.parse(q.photos) : []; } catch { photos = []; }
  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(lang === "th" ? "th-TH" : "en-US") : "—");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 print:px-0 print:py-0 print:m-0 print:space-y-4 print:max-w-full">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, nav, header, aside, footer {
            display: none !important;
          }
        }
      `}</style>
      {/* Action Toolbar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <Link href="/quotations" className="text-xs font-extrabold text-slate-600 hover:text-[#0071e3] flex items-center gap-1.5 transition">
          <span>←</span> {lang === "th" ? "กลับไปรายการใบเสนอราคา" : "Back to Quotation List"}
        </Link>

        {/* Workflow Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action 1: Staff Submit */}
          {(q.status === "draft" || q.status === "rejected") && (
            <button
              onClick={handleStaffSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-md hover:from-blue-700 hover:to-indigo-700 cursor-pointer disabled:opacity-50"
            >
              🚀 {lang === "th" ? "ส่งดำเนินการ / ส่งขออนุมัติ" : "Submit for Approval"}
            </button>
          )}

          {/* Action 2: Supervisor Approve buttons (3 options) */}
          {q.status === "pending_approval" && isSupervisorUser && (
            <>
              {/* Button 1: Direct Approve */}
              <button
                onClick={handleSupervisorDirectApprove}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs shadow-md hover:from-emerald-600 hover:to-teal-700 cursor-pointer disabled:opacity-50"
                title="อนุมัติคุมราคาตามที่เสนอมา"
              >
                ✅ {lang === "th" ? "อนุมัติ" : "Approve"}
              </button>

              {/* Button 2: Conditional Approve */}
              <button
                onClick={() => setShowConditionalApproveModal(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-md hover:from-amber-600 hover:to-orange-700 cursor-pointer disabled:opacity-50"
                title="อนุมัติโดยมีเงื่อนไขกำกับเพิ่มเติม"
              >
                ⚠️ {lang === "th" ? "อนุมัติแบบมีเงื่อนไข" : "Conditional Approve"}
              </button>

              {/* Button 3: Reject */}
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 font-extrabold text-xs hover:bg-rose-100 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="ตีกลับเอกสารให้พนักงานปรับแก้ไขใหม่"
              >
                ❌ {lang === "th" ? "ตีกลับแก้ไข (Reject)" : "Reject"}
              </button>
            </>
          )}

          {/* Hide Edit button if status is approved/completed/finalized */}
          {q.status !== "approved" && q.status !== "completed" && q.status !== "finalized" && (
            <Link
              href={`/quotation/new?id=${q.id}`}
              className="px-4 py-2 rounded-xl bg-sky-50 text-[#0071e3] border border-sky-200 hover:bg-[#0071e3] hover:text-white font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5"
            >
              ✏️ {lang === "th" ? "แก้ไข" : "Edit"}
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0071e3] to-blue-700 text-white font-extrabold text-xs hover:from-blue-600 hover:to-blue-800 transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            🖨 {lang === "th" ? "พิมพ์ / PDF" : "Print / PDF"}
          </button>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-rose-600">❌</span> ระบุเหตุผลในการตีกลับเอกสาร
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              ข้อความนี้จะถูกส่งกลับไปยังพนักงานเจ้าของเคส และจะถูกบันทึกประวัติไว้ใน Audit Log Timeline
            </p>

            <form onSubmit={handleSupervisorReject} className="space-y-4">
              <textarea
                required
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ตัวอย่าง: ค่าแรงทำสีฝากระโปรงหน้าสูงเกินราคากลาง 1,500 บาท กรุณาปรับลดลงก่อนส่งอนุมัติอีกครั้ง..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-medium"
              ></textarea>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  ยืนยันการตีกลับ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conditional Approve Modal */}
      {showConditionalApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-amber-600">⚠️</span> ระบุเงื่อนไขการอนุมัติ (บังคับระบุ)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              เงื่อนไขนี้จะถูกบันทึกประวัติไว้ใน Audit Log Timeline พร้อมปรับสถานะเป็นอนุมัติเสร็จสิ้น (Approved)
            </p>

            <form onSubmit={handleSupervisorConditionalApprove} className="space-y-4">
              <textarea
                required
                rows={4}
                value={conditionalNote}
                onChange={(e) => setConditionalNote(e.target.value)}
                placeholder="ตัวอย่าง: อนุมัติแบบมีเงื่อนไข ให้อู่นำส่งซากอะไหล่เก่าคืนบริษัทประกันภัยก่อนทำการเบิกจ่ายเงินสด..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium"
              ></textarea>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConditionalApproveModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs hover:from-amber-600 hover:to-orange-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  ยืนยันการอนุมัติแบบมีเงื่อนไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Premium Notification Modal */}
      {statusModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md no-print animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 transform transition-all scale-100">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl shadow-xs ${statusModal.badgeBg}`}>
              {statusModal.icon}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">{statusModal.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {statusModal.message}
              </p>
            </div>

            <button
              onClick={() => {
                setStatusModal(null);
                loadData();
              }}
              className={`w-full py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition cursor-pointer ${statusModal.buttonClass}`}
            >
              {lang === "th" ? "ตกลง" : "OK"}
            </button>
          </div>
        </div>
      )}

      {/* Report body */}
      <div className="card print:shadow-none print:border-0 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg overflow-hidden">
                <img src="/logo/Htech_logo.webp" alt="H Technology" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-bold text-[var(--navy-900)]">ClaimThunJai</div>
                <div className="text-[10px] text-slate-400">{lang === "th" ? "ใบสรุปการควบคุมราคาซ่อม" : "Repair Price Control Report"}</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-[var(--navy-900)]">{q.quotationNo}</div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-extrabold ${
              q.status === "approved" || q.status === "finalized"
                ? "bg-emerald-50 text-emerald-700"
                : q.status === "pending_approval"
                ? "bg-amber-50 text-amber-700"
                : q.status === "rejected"
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {q.status === "approved" || q.status === "finalized"
                ? "อนุมัติเสร็จสิ้น"
                : q.status === "pending_approval"
                ? "รอ Supervisor อนุมัติ"
                : q.status === "rejected"
                ? "ตีกลับแก้ไข"
                : "ร่าง"}
            </span>
          </div>
        </div>

        {/* Saving banner (Premium Blue & Print-friendly) */}
        <div className="bg-gradient-to-r from-[#0071e3] via-blue-600 to-indigo-700 print:bg-none print:border-2 print:border-[#0071e3] print:text-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-xs font-bold opacity-90 print:opacity-100 print:text-slate-700">
              {lang === "th" ? "ยอดเงินประหยัดจากการคุมราคา (Saving Amount)" : "Total Saving Amount"}
            </div>
            <div className="text-2xl font-extrabold font-mono mt-0.5 print:text-[#0071e3]">
              ฿{fmtBaht(t.totalSaving, lang)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
            <div className="bg-white/15 print:bg-slate-100 print:text-slate-900 px-3 py-1.5 rounded-lg border border-white/20 print:border-slate-300">
              <div className="opacity-85 print:opacity-100 font-medium text-[11px]">{lang === "th" ? "ราคาเสนอรวม" : "Total Quoted"}</div>
              <div className="font-mono font-bold">฿{fmtBaht(t.totalQuoted, lang)}</div>
            </div>
            <div className="bg-white/15 print:bg-slate-100 print:text-slate-900 px-3 py-1.5 rounded-lg border border-white/20 print:border-slate-300">
              <div className="opacity-85 print:opacity-100 font-medium text-[11px]">{lang === "th" ? "ราคาอนุมัติหลังคุม" : "Approved Controlled"}</div>
              <div className="font-mono font-bold">฿{fmtBaht(t.totalControlled, lang)}</div>
            </div>
            <div className="bg-white/25 print:bg-blue-50 print:text-[#0071e3] px-3 py-1.5 rounded-lg border border-white/30 print:border-sky-300">
              <div className="font-bold text-[11px]">{lang === "th" ? "สัดส่วนประหยัด (Saving %)" : "Saving %"}</div>
              <div className="font-mono font-extrabold text-sm">{t.savingPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>



        {/* Customer */}
        <div>
          <h3 className="font-bold text-[var(--navy-900)] mb-2">1. {lang === "th" ? "ข้อมูลลูกค้า" : "Customer"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KV label={lang === "th" ? "ชื่อลูกค้า" : "Name"} value={q.customerName} />
            <KV label={lang === "th" ? "ทะเบียน" : "Plate"} value={q.licensePlate} />
            <KV label={lang === "th" ? "ยี่ห้อ" : "Brand"} value={q.vehicleBrand} />
            <KV label={lang === "th" ? "รุ่น" : "Model"} value={q.vehicleModel} />
            <KV label={lang === "th" ? "ปี" : "Year"} value={q.vehicleYear} />
            <KV label={lang === "th" ? "เลขตัวถัง" : "Chassis"} value={q.chassisNo} />
            <KV label={lang === "th" ? "สี" : "Color"} value={q.color} />
            <KV label={lang === "th" ? "เลขไมล์" : "Mileage"} value={q.mileage?.toLocaleString()} />
          </div>
        </div>

        {/* Insurance */}
        <div>
          <h3 className="font-bold text-[var(--navy-900)] mb-2">2. {lang === "th" ? "ข้อมูลประกัน" : "Insurance"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KV label={lang === "th" ? "บริษัทประกัน" : "Insurer"} value={q.insurerName} />
            <KV label={lang === "th" ? "เลขเคลม" : "Claim No."} value={q.claimNo} />
            <KV label={lang === "th" ? "เลขกรมธรรม์" : "Policy No."} value={q.policyNo} />
            <KV label={lang === "th" ? "ประเภท" : "Type"} value={q.policyType} />
            <KV label={lang === "th" ? "ทุนประกัน" : "Sum Insured"} value={q.sumInsured ? `฿${fmtBaht(q.sumInsured, lang)}` : null} />
            <KV label={lang === "th" ? "ค่าเสียหายส่วนแรก" : "Deductible"} value={q.deductible ? `฿${fmtBaht(q.deductible, lang)}` : null} />
            <KV label={lang === "th" ? "เริ่มคุ้มครอง" : "Start"} value={fmtDate(q.coverageStart)} />
            <KV label={lang === "th" ? "สิ้นสุด" : "End"} value={fmtDate(q.coverageEnd)} />
          </div>
        </div>

        {/* Center */}
        <div>
          <h3 className="font-bold text-[var(--navy-900)] mb-2">3. {lang === "th" ? "ศูนย์/อู่บริการ" : "Service Center"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KV label={lang === "th" ? "ชื่อศูนย์" : "Name"} value={q.centerName} />
            <KV label={lang === "th" ? "ติดต่อ" : "Contact"} value={q.centerContact} />
            <KV label={lang === "th" ? "ที่อยู่" : "Address"} value={q.centerAddress} />
          </div>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <h3 className="font-bold text-[var(--navy-900)] mb-2">4. {lang === "th" ? "รูปภาพรถยนต์" : "Vehicle Photos"}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((p, i) => (
                <figure key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="aspect-[4/3] bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption || ""} className="w-full h-full object-cover" />
                  </div>
                  {p.caption && <figcaption className="text-[11px] text-slate-500 px-2 py-1">{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <ItemSection title={`${photos.length > 0 ? 5 : 4}. ${lang === "th" ? "ค่าแรง" : "Labor"}`} items={labor} lang={lang} />
        <ItemSection title={`${photos.length > 0 ? 6 : 5}. ${lang === "th" ? "ค่าอะไหล่" : "Parts"}`} items={parts} lang={lang} />

        {/* PDF & Screen Summary Table (End Summary - Centered Layout) */}
        {(() => {
          const discAmount = (q as any).discountAmount != null ? Math.max(0, Number((q as any).discountAmount) || 0) : 0;
          const netBeforeVat = Math.max(0, t.totalControlled - discAmount);
          const includeVat = (q as any).includeVat !== false;
          const vatAmount = includeVat ? netBeforeVat * 0.07 : 0;
          const grandNet = netBeforeVat + vatAmount;

          return (
            <div className="pt-6 border-t-2 border-slate-300 space-y-3 break-inside-avoid">
              <h3 className="font-bold text-[var(--navy-900)] text-sm flex items-center justify-center print:justify-between">
                <span>📋 ผลการพิจารณาและสรุปยอดเงินอนุมัติสุทธิ (Approval Summary)</span>
              </h3>

              <div className="flex justify-center print:justify-end">
                <table className="w-full max-w-sm text-xs border-collapse border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr className="bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-700">ผลการพิจารณา :</td>
                      <td className="p-2.5 text-right font-extrabold text-slate-900">
                        {q.status === "approved" || q.status === "completed" || q.status === "finalized"
                          ? "อนุมัติ"
                          : q.status === "rejected"
                          ? "ตีกลับแก้ไข"
                          : "รออนุมัติ"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-600">ราคาเสนอ :</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {t.totalQuoted.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-600">ราคาหลังคุม :</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                        {t.totalControlled.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-600">ราคาส่วนลด :</td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                        {discAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-600">VAT 7% :</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                        {includeVat
                          ? `${vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
                          : "0.00 บาท (ไม่คิด VAT)"}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/80 border-t-2 border-[#0071e3]">
                      <td className="p-3 font-extrabold text-[#0071e3] text-sm">ราคาอนุมัติสุทธิ :</td>
                      <td className="p-3 text-right font-mono font-extrabold text-[#0071e3] text-sm">
                        {grandNet.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Chronological Audit Logs & Comment History Timeline (Hidden on Print / Internal Only) */}
        <div className="pt-6 border-t border-slate-200 no-print">
          <h3 className="font-bold text-[var(--navy-900)] mb-4 flex items-center gap-2">
            <span>📜</span> ประวัติการอนุมัติและบันทึกข้อคิดเห็น (Audit Logs & Comment History)
          </h3>

          {logs.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-3">ยังไม่มีประวัติการบันทึกข้อความในระบบ</div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 font-mono before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                    log.action === "APPROVED"
                      ? "bg-emerald-500 shadow-xs"
                      : log.action === "REJECTED"
                      ? "bg-rose-500 shadow-xs"
                      : "bg-blue-500"
                  }`}></span>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{log.action === "APPROVED" ? "✅" : log.action === "REJECTED" ? "❌" : "📝"}</span>
                        <span>{log.authorName} ({log.authorRole || "ผู้ใช้งาน"})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleString("th-TH")}
                      </span>
                    </div>

                    {log.comment && (
                      <p className={`font-sans pt-1 font-medium ${log.action === "REJECTED" ? "text-rose-700 font-bold" : "text-slate-600"}`}>
                        {log.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Action Bar (Duplicate for user convenience) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print mt-6">
          <Link href="/quotations" className="text-xs font-extrabold text-slate-600 hover:text-[#0071e3] flex items-center gap-1.5 transition">
            <span>←</span> {lang === "th" ? "กลับไปรายการใบเสนอราคา" : "Back to Quotation List"}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {(q.status === "draft" || q.status === "rejected") && (
              <button
                onClick={handleStaffSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-md hover:from-blue-700 hover:to-indigo-700 cursor-pointer disabled:opacity-50"
              >
                🚀 {lang === "th" ? "ส่งดำเนินการ / ส่งขออนุมัติ" : "Submit for Approval"}
              </button>
            )}

            {/* Action 2: Supervisor Approve buttons (3 options) */}
            {q.status === "pending_approval" && isSupervisorUser && (
              <>
                {/* Button 1: Direct Approve */}
                <button
                  onClick={handleSupervisorDirectApprove}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs shadow-md hover:from-emerald-600 hover:to-teal-700 cursor-pointer disabled:opacity-50"
                  title="อนุมัติคุมราคาตามที่เสนอมา"
                >
                  ✅ {lang === "th" ? "อนุมัติ" : "Approve"}
                </button>

                {/* Button 2: Conditional Approve */}
                <button
                  onClick={() => setShowConditionalApproveModal(true)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-md hover:from-amber-600 hover:to-orange-700 cursor-pointer disabled:opacity-50"
                  title="อนุมัติโดยมีเงื่อนไขกำกับเพิ่มเติม"
                >
                  ⚠️ {lang === "th" ? "อนุมัติแบบมีเงื่อนไข" : "Conditional Approve"}
                </button>

                {/* Button 3: Reject */}
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 font-extrabold text-xs hover:bg-rose-100 cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="ตีกลับเอกสารให้พนักงานปรับแก้ไขใหม่"
                >
                  ❌ {lang === "th" ? "ตีกลับแก้ไข (Reject)" : "Reject"}
                </button>
              </>
            )}

            {/* Hide Edit button if status is approved/completed/finalized */}
            {q.status !== "approved" && q.status !== "completed" && q.status !== "finalized" && (
              <Link
                href={`/quotation/new?id=${q.id}`}
                className="px-4 py-2 rounded-xl bg-sky-50 text-[#0071e3] border border-sky-200 hover:bg-[#0071e3] hover:text-white font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5"
              >
                ✏️ {lang === "th" ? "แก้ไข" : "Edit"}
              </Link>
            )}

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0071e3] to-blue-700 text-white font-extrabold text-xs hover:from-blue-600 hover:to-blue-800 transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              🖨 {lang === "th" ? "พิมพ์ / PDF" : "Print / PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
