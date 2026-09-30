"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/LangContext";
import * as XLSX from "xlsx";

type Row = {
  id: number;
  userName: string;
  userEmail: string;
  branchName: string | null;
  fileName: string;
  fileCount: number;
  pageCount: number;
  mode: string;
  success: boolean;
  errorMessage: string | null;
  itemsFound: number;
  quotationId: string | null;
  quotationNo: string | null;
  createdAt: string;
};

type Summary = { total: number; billable: number; failed: number; totalPages: number };

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

function StatCard({ label, value, tone = "blue", hint }: {
  label: string; value: number | string; tone?: "blue" | "slate" | "red" | "amber"; hint?: string;
}) {
  const tones = {
    blue: "bg-blue-50 border-blue-200 text-[#0071e3]",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${tones}`}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="text-3xl font-extrabold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] mt-1 opacity-70 font-medium">{hint}</div>}
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
      "ผู้อัปโหลด": r.userName,
      "อีเมล": r.userEmail,
      "สาขา": r.branchName || "",
      "ชื่อไฟล์": r.fileName,
      "จำนวนไฟล์": r.fileCount,
      "จำนวนหน้า": r.pageCount || "",
      "โหมด": r.mode === "batch" ? "หลายเคส" : "เคสเดียว",
      "ผลการอ่าน": r.success ? "สำเร็จ" : "ไม่สำเร็จ",
      "รายการซ่อมที่อ่านได้": r.itemsFound,
      "เลขที่เคส": r.quotationNo || "",
      "หมายเหตุ": r.errorMessage || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 22 }, { wch: 26 }, { wch: 22 },
      { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <StatCard tone="slate" label={th ? "อัปโหลดทั้งหมด" : "Total uploads"} value={summary.total} />
          <StatCard tone="blue" label={th ? "อ่านสำเร็จ" : "Succeeded"} value={summary.billable}
            hint={th ? "ยอดที่ใช้ออกใบแจ้งหนี้" : "Use this for invoicing"} />
          <StatCard tone="red" label={th ? "อ่านไม่สำเร็จ" : "Failed"} value={summary.failed} />
          <StatCard tone="slate" label={th ? "จำนวนหน้ารวม" : "Total pages"} value={summary.totalPages} />
          {/* Divides by total uploads so it visibly reconciles with the two
              cards beside it (total pages ÷ total uploads). */}
          <StatCard tone="slate" label={th ? "เฉลี่ยจำนวนหน้า" : "Avg. pages"}
            value={summary.total > 0 ? Math.round((summary.totalPages / summary.total) * 10) / 10 : 0} />
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
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-center text-xs font-bold text-slate-500">
                <th className="px-3 py-3">{th ? "วันที่/เวลา" : "Date / Time"}</th>
                <th className="px-3 py-3">{th ? "ผู้อัปโหลด" : "Uploaded by"}</th>
                <th className="px-3 py-3">{th ? "ไฟล์" : "File"}</th>
                <th className="px-3 py-3">{th ? "จำนวนหน้า" : "Pages"}</th>
                <th className="px-3 py-3">{th ? "โหมด" : "Mode"}</th>
                <th className="px-3 py-3">{th ? "สถานะ" : "Status"}</th>
                <th className="px-3 py-3">{th ? "เลขที่เคส" : "Case No."}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400 text-sm">
                  {th ? "กำลังโหลด..." : "Loading..."}
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400 text-sm">
                  {th ? "ไม่พบข้อมูลในช่วงเวลาที่เลือก" : "No records in the selected range"}
                </td></tr>
              ) : pagedRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs tabular-nums">
                    {fmtDateTime(r.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-800 text-xs">{r.userName}</div>
                    <div className="text-[11px] text-slate-400">{r.branchName || r.userEmail}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs text-slate-700 truncate max-w-[260px]" title={r.fileName}>{r.fileName}</div>
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
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 whitespace-nowrap">
                      {r.mode === "batch" ? (th ? "หลายเคส" : "Batch") : (th ? "เคสเดียว" : "Single")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
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
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.quotationNo ? (
                      <a href={`/quotations/${r.quotationId}`}
                        className="text-[#0071e3] font-bold text-xs hover:underline">
                        {r.quotationNo}
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {th ? "— ไม่ได้บันทึกเคส" : "— not saved"}
                      </span>
                    )}
                  </td>
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
