"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/LangContext";
import * as XLSX from "xlsx";
import { fmtBaht } from "@/lib/quotation";

type Row = {
  id: number;
  userName: string;
  userEmail: string;
  branchName: string | null;
  fileName: string;
  fileCount: number;
  pageCount: number;
  amountThb: number;
  saveError: string | null;
  outcome: "scan_failed" | "case_created" | "save_failed" | "pending" | "client_interrupted";
  // Present only when the API judged the session to be the system owner.
  aiUsed?: boolean;
  model?: string | null;
  costUsd?: number;
  costThb?: number;
  profitThb?: number;
  mode: string;
  success: boolean;
  errorMessage: string | null;
  itemsFound: number;
  quotationId: string | null;
  quotationNo: string | null;
  createdAt: string;
};

type Summary = {
  total: number; billable: number; failed: number; totalPages: number; totalAmountThb: number;
  // Owner-only extras — absent for everyone else, by server-side design.
  owner?: true; usdToThb?: number; usdToThbNote?: string | null; totalCostUsd?: number; totalCostThb?: number;
  totalProfitThb?: number; marginPct?: number; noAiScans?: number;
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function monthRange(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(first), to: iso(last) };
}

type Tone = "blue" | "indigo" | "emerald" | "red" | "white";
const TONE_TEXT: Record<Tone, string> = {
  blue: "text-[#0071e3]",
  indigo: "text-indigo-700",
  emerald: "text-emerald-600",
  red: "text-red-600",
  white: "text-white",
};

type Theme = "sky" | "mint" | "violet" | "hero";
const THEME: Record<Theme, { card: string; title: string; label: string; hint: string; divider: string; iconBg: string }> = {
  sky: {
    card: "bg-gradient-to-br from-sky-50 via-blue-50 to-blue-100 border-blue-200",
    title: "text-blue-900", label: "text-blue-700/70", hint: "text-blue-700/70",
    divider: "border-blue-200", iconBg: "bg-white/80 shadow-sm",
  },
  mint: {
    card: "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border-emerald-200",
    title: "text-emerald-900", label: "text-slate-600", hint: "text-emerald-800/70",
    divider: "border-emerald-200", iconBg: "bg-white/80 shadow-sm",
  },
  violet: {
    card: "bg-gradient-to-br from-violet-50 via-indigo-50 to-indigo-100 border-indigo-200",
    title: "text-indigo-900", label: "text-indigo-700/70", hint: "text-indigo-800/70",
    divider: "border-indigo-200", iconBg: "bg-white/80 shadow-sm",
  },
  // The one figure an invoice is built from — premium blue, as the design rules ask.
  hero: {
    card: "bg-gradient-to-br from-blue-700 to-indigo-800 border-transparent shadow-lg shadow-blue-500/25",
    title: "text-blue-100", label: "text-blue-100/80", hint: "text-blue-100/80",
    divider: "border-white/20", iconBg: "bg-white/15",
  },
};

/**
 * One card, one topic, one or more figures side by side, everything centred.
 * A figure gets its own colour so "succeeded / failed" or "total / average"
 * read at a glance without splitting into separate cards.
 */
function MetricCard({ title, icon, hint, theme, metrics }: {
  title: string;
  icon: string;
  hint?: string;
  theme: Theme;
  metrics: { label?: string; value: number | string; tone: Tone }[];
}) {
  const t = THEME[theme];
  return (
    <div className={`rounded-2xl border p-5 flex flex-col items-center text-center min-h-[164px] transition hover:-translate-y-0.5 hover:shadow-md ${t.card}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2 ${t.iconBg}`}>{icon}</div>
      <div className={`text-xs font-extrabold tracking-wide ${t.title}`}>{title}</div>
      <div className={`mt-2 w-full grid ${metrics.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {metrics.map((m, i) => (
          <div key={i} className={`flex flex-col items-center px-2 ${i > 0 ? `border-l ${t.divider}` : ""}`}>
            <div className={`text-3xl font-black tabular-nums leading-none ${TONE_TEXT[m.tone]}`}>{m.value}</div>
            {m.label && <div className={`text-[11px] font-semibold mt-1.5 ${t.label}`}>{m.label}</div>}
          </div>
        ))}
      </div>
      {hint && <div className={`text-[11px] mt-auto pt-2.5 font-medium ${t.hint}`}>{hint}</div>}
    </div>
  );
}

export default function UploadTransactionsReport() {
  const { lang } = useLang();
  const init = monthRange(0);
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/upload-transactions?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
      setRows(data.rows || []);
      setSummary(data.summary || null);
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [q, from, to, pageSize]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.userName, r.userEmail, r.branchName, r.fileName, r.quotationNo]
        .some((v) => (v || "").toLowerCase().includes(needle))
    );
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const exportExcel = () => {
    const data = filtered.map((r, i) => ({
      "#": i + 1,
      "วันที่/เวลา": fmtDateTime(r.createdAt),
      "เลขที่เคส": r.quotationNo || "",
      "ผู้อัปโหลด": r.userName,
      "อีเมล": r.userEmail,
      "สาขา": r.branchName || "",
      "ชื่อไฟล์": r.fileName,
      "จำนวนไฟล์": r.fileCount,
      "จำนวนหน้า": r.pageCount || "",
      "ผลการอ่าน": r.success ? "สำเร็จ" : "ไม่สำเร็จ",
      "รายการซ่อมที่อ่านได้": r.itemsFound,
      "จำนวนเงิน (บาท)": r.amountThb,
      "หมายเหตุ":
        r.outcome === "client_interrupted" ? "ปิดหน้าต่าง/หลุดการเชื่อมต่อระหว่างทำงาน (เหตุจากฝั่งผู้ใช้ ไม่ใช่ระบบ)"
        : r.outcome === "save_failed" ? `ระบบบันทึกเคสล้มเหลว: ${r.saveError || ""}`
        : r.outcome === "pending" ? "กำลังบันทึก"
        : r.errorMessage || "",
      ...(summary?.owner
        ? {
            "ใช้ AI": r.aiUsed ? "ใช่" : "ไม่",
            "ต้นทุน AI (USD)": Number((r.costUsd ?? 0).toFixed(4)),
            "ต้นทุน AI (บาท)": Number((r.costThb ?? 0).toFixed(2)),
            "กำไร (บาท)": Number((r.profitThb ?? 0).toFixed(2)),
          }
        : {}),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 26 }, { wch: 22 },
      { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 40 },
      ...(summary?.owner ? [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 14 }] : [])];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Upload Transactions");
    XLSX.writeFile(wb, `upload-transactions-${from}_${to}.xlsx`);
  };

  const th = lang === "th";

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {th ? "บันทึกการอัปโหลดเอกสาร (Audit Log)" : "Document Upload Audit Log"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {th
            ? "บันทึกทุกครั้งที่มีการอัปโหลดเอกสารเข้าระบบ เพื่อใช้อ้างอิงในการออกใบแจ้งหนี้ ตรวจสอบย้อนหลังได้ว่าใครอัปโหลด เมื่อใด และได้เป็นเคสหมายเลขใด"
            : "Every document scan recorded for invoicing and traceability: who uploaded, when, and which case it produced."}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{th ? "ตั้งแต่วันที่" : "From"}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0071e3]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{th ? "ถึงวันที่" : "To"}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0071e3]" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { const m = monthRange(0); setFrom(m.from); setTo(m.to); }}
              className="px-3.5 py-2 rounded-lg bg-blue-50 text-[#0071e3] border border-blue-200 hover:bg-blue-100 text-xs font-bold transition cursor-pointer">
              {th ? "เดือนนี้" : "This month"}
            </button>
            <button onClick={() => { const m = monthRange(-1); setFrom(m.from); setTo(m.to); }}
              className="px-3.5 py-2 rounded-lg bg-blue-50 text-[#0071e3] border border-blue-200 hover:bg-blue-100 text-xs font-bold transition cursor-pointer">
              {th ? "เดือนที่แล้ว" : "Last month"}
            </button>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1">{th ? "ค้นหา" : "Search"}</label>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={th ? "ชื่อผู้อัปโหลด, ชื่อไฟล์, เลขที่เคส..." : "Uploader, file name, case no..."}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0071e3]" />
          </div>
          <button onClick={exportExcel} disabled={filtered.length === 0}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              filtered.length === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            }`}>
            📥 Export Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <MetricCard
            theme="sky"
            icon="📤"
            title={th ? "อัปโหลดทั้งหมด" : "Total uploads"}
            hint={th ? "ครั้งที่อัปโหลดในช่วงที่เลือก" : "Uploads in the selected range"}
            metrics={[{ value: summary.total, tone: "blue" }]}
          />
          <MetricCard
            theme="mint"
            icon="🔍"
            title={th ? "ผลการอ่าน" : "Scan results"}
            metrics={[
              { label: th ? "อ่านสำเร็จ" : "Succeeded", value: summary.billable, tone: "emerald" },
              { label: th ? "อ่านไม่สำเร็จ" : "Failed", value: summary.failed, tone: "red" },
            ]}
          />
          <MetricCard
            theme="violet"
            icon="📄"
            title={th ? "จำนวนหน้า" : "Pages"}
            metrics={[
              { label: th ? "รวม" : "Total", value: summary.totalPages, tone: "indigo" },
              // ÷ total uploads so it reconciles against the figures beside it.
              { label: th ? "เฉลี่ยต่อครั้ง" : "Avg. per upload",
                value: summary.total > 0 ? Math.round((summary.totalPages / summary.total) * 10) / 10 : 0,
                tone: "indigo" },
            ]}
          />
          <MetricCard
            theme="hero"
            icon="💰"
            title={th ? "รวมค่าใช้จ่าย" : "Total charges"}
            hint={th ? "คิดเฉพาะเคสที่อ่านสำเร็จ · ไม่รวมภาษีมูลค่าเพิ่ม (VAT)" : "Successful scans only · excludes VAT"}
            metrics={[{ value: `฿${fmtBaht(summary.totalAmountThb, lang as "th" | "en")}`, tone: "white" }]}
          />
        </div>
      )}

      {summary?.owner && (
        <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-base">🔒</span>
            <span className="text-sm font-extrabold text-amber-900">
              {th ? "ข้อมูลภายในเจ้าของระบบ" : "System-owner internal data"}
            </span>
            <span className="text-[11px] font-semibold text-amber-800/80 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
              {th ? "แสดงเฉพาะบัญชีเจ้าของ — พนักงานและลูกค้าไม่เห็นส่วนนี้" : "Owner accounts only — hidden from staff and customers"}
            </span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white border border-amber-200 p-4 text-center">
              <div className="text-[11px] font-bold text-slate-500">{th ? "รายได้ (เก็บลูกค้า)" : "Revenue"}</div>
              <div className="text-2xl font-black text-[#0071e3] tabular-nums mt-1">฿{fmtBaht(summary.totalAmountThb, lang as "th" | "en")}</div>
            </div>
            <div className="rounded-xl bg-white border border-amber-200 p-4 text-center">
              <div className="text-[11px] font-bold text-slate-500">{th ? "ต้นทุน AI (จ่าย Anthropic)" : "AI cost"}</div>
              <div className="text-2xl font-black text-amber-700 tabular-nums mt-1">฿{fmtBaht(summary.totalCostThb ?? 0, lang as "th" | "en")}</div>
              <div className="text-[11px] text-slate-400 tabular-nums">${(summary.totalCostUsd ?? 0).toFixed(4)}</div>
            </div>
            <div className="rounded-xl bg-white border border-amber-200 p-4 text-center">
              <div className="text-[11px] font-bold text-slate-500">{th ? "กำไร" : "Profit"}</div>
              <div className={`text-2xl font-black tabular-nums mt-1 ${(summary.totalProfitThb ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {(summary.totalProfitThb ?? 0) < 0 ? "-" : ""}฿{fmtBaht(Math.abs(summary.totalProfitThb ?? 0), lang as "th" | "en")}
              </div>
            </div>
            <div className="rounded-xl bg-white border border-amber-200 p-4 text-center">
              <div className="text-[11px] font-bold text-slate-500">{th ? "อัตรากำไร (Margin)" : "Margin"}</div>
              <div className={`text-2xl font-black tabular-nums mt-1 ${(summary.marginPct ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {(summary.marginPct ?? 0).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-amber-900/80 font-medium flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {th ? `อัตราที่ใช้: 1 USD = ${summary.usdToThb} THB` : `Rate used: 1 USD = ${summary.usdToThb} THB`}
              {summary.usdToThbNote ? ` — ${summary.usdToThbNote}` : ""}
              {th ? " (ตั้งค่าใน USD_TO_THB)" : " (USD_TO_THB)"}
            </span>
            <span>{th ? `เคสที่ไม่ใช้ AI เลย (ต้นทุน 0): ${summary.noAiScans ?? 0} จาก ${summary.total}` : `Scans with no AI (zero cost): ${summary.noAiScans ?? 0} of ${summary.total}`}</span>
          </div>
        </div>
      )}

      {err && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 font-semibold">
          ⚠️ {err}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b-2 border-blue-200">
              <tr className="text-center text-xs font-extrabold text-blue-900">
                <th className="px-3 py-3">{th ? "วันที่/เวลา" : "Date / Time"}</th>
                <th className="px-3 py-3">{th ? "เลขที่เคส" : "Case No."}</th>
                <th className="px-3 py-3">{th ? "ผู้อัปโหลด" : "Uploaded by"}</th>
                <th className="px-3 py-3">{th ? "ไฟล์" : "File"}</th>
                <th className="px-3 py-3">{th ? "จำนวนหน้า" : "Pages"}</th>
                <th className="px-3 py-3">{th ? "สถานะ" : "Status"}</th>
                <th className="px-3 py-3">{th ? "จำนวนเงิน (บาท)" : "Amount (THB)"}</th>
                {summary?.owner && (
                  <>
                    <th className="px-3 py-3 bg-amber-100/70 text-amber-900">{th ? "ต้นทุน AI" : "AI cost"}</th>
                    <th className="px-3 py-3 bg-amber-100/70 text-amber-900">{th ? "กำไร" : "Profit"}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={summary?.owner ? 9 : 7} className="px-3 py-10 text-center text-slate-400 text-sm">
                  {th ? "กำลังโหลด..." : "Loading..."}
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={summary?.owner ? 9 : 7} className="px-3 py-10 text-center text-slate-400 text-sm">
                  {th ? "ไม่พบข้อมูลในช่วงเวลาที่เลือก" : "No records in the selected range"}
                </td></tr>
              ) : pagedRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600 text-xs tabular-nums">
                    {fmtDateTime(r.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {r.quotationNo ? (
                      <a href={`/quotations/${r.quotationId}`}
                        className="text-[#0071e3] font-bold text-xs hover:underline">
                        {r.quotationNo}
                      </a>
                    ) : r.outcome === "client_interrupted" ? (
                      <span
                        className="text-[11px] font-bold text-amber-700 whitespace-normal"
                        title={th
                          ? "อ่านสำเร็จแล้ว แต่คำสั่งบันทึกเคสไม่เคยมาถึงระบบ — ผู้ใช้ปิดหน้าต่าง ไฟดับ หรือหลุดการเชื่อมต่อระหว่างทำงาน (เหตุจากฝั่งผู้ใช้ ไม่ใช่ระบบ)"
                          : "Scan succeeded but no save request ever reached the server — the user closed the window, lost power or connection (user-side, not a system fault)"}
                      >
                        ⚠️ {th ? "ปิดหน้าต่างระหว่างทำงาน (ฝั่งผู้ใช้)" : "Closed mid-run (user-side)"}
                      </span>
                    ) : r.outcome === "save_failed" ? (
                      <span className="text-[11px] font-bold text-red-700 whitespace-normal" title={r.saveError || ""}>
                        ❌ {th ? "ระบบบันทึกเคสล้มเหลว" : "System failed to save"}
                      </span>
                    ) : r.outcome === "pending" ? (
                      <span className="text-[11px] font-semibold text-slate-500">
                        ⏳ {th ? "กำลังบันทึก…" : "Saving…"}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="font-semibold text-slate-800 text-xs">{r.userName}</div>
                    <div className="text-[11px] text-slate-400">{r.branchName || r.userEmail}</div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="text-xs text-slate-700 truncate max-w-[260px] mx-auto" title={r.fileName}>{r.fileName}</div>
                    {r.fileCount > 1 && (
                      <div className="text-[11px] text-slate-400">
                        {th ? `รวม ${r.fileCount} ไฟล์` : `${r.fileCount} files`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.pageCount > 0 ? (
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        {r.pageCount}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.success ? (
                      <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                        ✅ {th ? `อ่านได้ ${r.itemsFound} รายการ` : `${r.itemsFound} items`}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-red-700" title={r.errorMessage || ""}>
                        ❌ {th ? "อ่านไม่สำเร็จ" : "Failed"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {r.amountThb > 0 ? (
                      <span className="text-xs font-extrabold text-slate-800 tabular-nums">
                        ฿{fmtBaht(r.amountThb, lang as "th" | "en")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 font-medium">฿0.00</span>
                    )}
                  </td>
                  {summary?.owner && (
                    <>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap bg-amber-50/60">
                        {r.aiUsed ? (
                          <div>
                            <div className="text-xs font-bold text-amber-900 tabular-nums">฿{fmtBaht(r.costThb ?? 0, lang as "th" | "en")}</div>
                            <div className="text-[10px] text-amber-700/70 tabular-nums">${(r.costUsd ?? 0).toFixed(4)}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700">{th ? "฿0 · ไม่ใช้ AI" : "฿0 · no AI"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap bg-amber-50/60">
                        <span className={`text-xs font-extrabold tabular-nums ${(r.profitThb ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {(r.profitThb ?? 0) < 0 ? "-" : ""}฿{fmtBaht(Math.abs(r.profitThb ?? 0), lang as "th" | "en")}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              {th
                ? `แสดง ${filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filtered.length)} จากทั้งหมด ${filtered.length} รายการ`
                : `Showing ${filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} items`}
            </span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-slate-500 font-bold">{th ? "แสดงหน้าละ:" : "Per page:"}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition shadow-2xs cursor-pointer"
            >
              ← {th ? "ถอยหลัง" : "Prev"}
            </button>
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-slate-400 font-bold">…</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                        currentPage === p
                          ? "bg-[#0071e3] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition shadow-2xs cursor-pointer"
            >
              {th ? "ถัดไป" : "Next"} →
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        {th
          ? "แสดงสูงสุด 2,000 รายการล่าสุดต่อการค้นหา — หากต้องการข้อมูลย้อนหลังมากกว่านี้ กรุณาแบ่งช่วงวันที่"
          : "Shows the latest 2,000 records per query — narrow the date range for older data."}
      </p>
    </div>
  );
}
