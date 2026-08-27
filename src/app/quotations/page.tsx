"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { fmtBaht } from "@/lib/quotation";

type Row = {
  id: string;
  quotationNo: string;
  status: string;
  customerName: string | null;
  licensePlate: string | null;
  vehicleBrand: string | null;
  insurerName: string | null;
  claimNo: string | null;
  totalQuoted: number;
  totalControlled: number;
  totalSaving: number;
  isArchived: boolean;
  createdByName?: string | null;
  createdByEmail?: string | null;
  branchName?: string | null;
  branch?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
};

type BulkModal = { type: "delete" | "archive" | "unarchive"; ids: string[] } | null;

export default function QuotationsPage() {
  const { lang } = useLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkModal>(null);
  const [bulkWorking, setBulkWorking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setSelectedIds(new Set());
    fetch(`/api/quotations${showArchived ? "?showArchived=true" : ""}`)
      .then((r) => r.json())
      .then((d) => setRows(d.quotations || []))
      .finally(() => setLoading(false));
  }, [showArchived]);

  useEffect(load, [load]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, statusFilter, pageSize, showArchived]);

  // Role & Branch Access Control (RBAC)
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [userBranch, setUserBranch] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
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
            !isSuperAdmin && (roleName.includes("supervisor") || roleName.includes("หัวหน้า"));
          if (isSuperAdmin) {
            setUserRole("ADMIN");
          } else if (isSupervisor) {
            setUserRole("SUPERVISOR");
            setUserBranch(u.branchName || u.branch?.name || "");
          } else {
            setUserRole("STAFF");
            setUserBranch(u.branchName || u.branch?.name || "");
          }
        } catch (e) {
          console.error("RBAC parse error:", e);
        }
      }
    }
  }, []);

  // Filter Logic
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.quotationNo && r.quotationNo.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.claimNo && r.claimNo.toLowerCase().includes(q)) ||
        (r.licensePlate && r.licensePlate.toLowerCase().includes(q)) ||
        (r.insurerName && r.insurerName.toLowerCase().includes(q));

      const itemDateStr = r.updatedAt || r.createdAt;
      const itemDate = itemDateStr ? new Date(itemDateStr) : null;
      const matchStart = !startDate || !itemDate || itemDate >= new Date(startDate + "T00:00:00");
      const matchEnd = !endDate || !itemDate || itemDate <= new Date(endDate + "T23:59:59");

      const isCompleted = r.status === "completed" || r.status === "finalized" || (r._count?.items ?? 0) > 0 || r.totalQuoted > 0;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && isCompleted) ||
        (statusFilter === "draft" && !isCompleted);

      const rowBranch = r.branchName || r.branch?.name || "";
      const rowCreatorEmail = r.createdByEmail || "";
      let matchBranch = false;
      if (userRole === "ADMIN") {
        matchBranch = true;
      } else {
        const normUserB = (userBranch || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const normRowB = (rowBranch || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const isBranchMatch =
          Boolean(rowBranch) && (rowBranch === userBranch || (Boolean(normUserB) && Boolean(normRowB) && (normRowB.includes(normUserB) || normUserB.includes(normRowB))));
        matchBranch = (isBranchMatch || rowCreatorEmail === (r as any).userEmail) && rowCreatorEmail !== "admin@htechnology.com";
      }

      return matchSearch && matchStart && matchEnd && matchStatus && matchBranch;
    });
  }, [rows, search, startDate, endDate, statusFilter, userRole, userBranch]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Quick Date Presets
  const setQuickDate = (preset: "today" | "7days" | "month" | "all") => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    if (preset === "all") { setStartDate(""); setEndDate(""); }
    else if (preset === "today") { setStartDate(todayStr); setEndDate(todayStr); }
    else if (preset === "7days") {
      const past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      setStartDate(`${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`);
      setEndDate(todayStr);
    } else if (preset === "month") {
      setStartDate(`${year}-${month}-01`);
      setEndDate(todayStr);
    }
  };

  // Selection helpers
  const allPageSelected = pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id));
  const somePageSelected = pagedRows.some((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      pagedRows.forEach((r) => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      pagedRows.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!bulkModal) return;
    setBulkWorking(true);
    try {
      await fetch("/api/quotations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: bulkModal.ids }),
      });
      setBulkModal(null);
      load();
    } finally { setBulkWorking(false); }
  };

  const handleBulkArchive = async (unarchive = false) => {
    if (!bulkModal) return;
    setBulkWorking(true);
    try {
      await fetch("/api/quotations/bulk-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: bulkModal.ids, unarchive }),
      });
      setBulkModal(null);
      load();
    } finally { setBulkWorking(false); }
  };

  const handleBulkExport = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkWorking(true);
    try {
      const res = await fetch("/api/quotations/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotations-export-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("เกิดข้อผิดพลาดในการ Export");
    } finally { setBulkWorking(false); }
  };

  const totalSaving = filteredRows.reduce((s, r) => s + r.totalSaving, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--navy-900)]">
            {lang === "th" ? "ใบเสนอราคาซ่อม" : "Repair Quotations"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {lang === "th" ? "ค้นหาและจัดการรายการใบเสนอราคาซ่อมรถยนต์พร้อมสรุปยอดประหยัด" : "Search & manage repair quotations"}
          </p>
        </div>
        <Link href="/quotation/new" className="btn-primary text-sm !py-2.5 !px-6 shadow-md shadow-blue-500/20">
          + {lang === "th" ? "สร้างใบใหม่" : "New Quotation"}
        </Link>
      </div>

      {/* Search & Filter Controls Card */}
      <div className="card !p-5 mb-6 space-y-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "th" ? "🔍 ค้นหาด้วยเลขที่ใบเสนอราคา, ชื่อลูกค้า, ทะเบียน, หรือหมายเลขเคลม…" : "Search by Quotation No, Customer, Plate, or Claim No…"}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-blue-100 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>

          {/* Date Range Inputs */}
          <div className="md:col-span-4 flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-medium text-slate-700" title="วันที่เริ่มต้น" />
            <span className="text-slate-400 font-bold text-xs">-</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-medium text-slate-700" title="วันที่สิ้นสุด" />
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-bold text-slate-700 bg-white">
              <option value="all">{lang === "th" ? "สถานะทั้งหมด" : "All Statuses"}</option>
              <option value="completed">{lang === "th" ? "✓ ออกรายงาน / อนุมัติแล้ว" : "Completed"}</option>
              <option value="draft">{lang === "th" ? "📝 บันทึกร่าง" : "Draft"}</option>
            </select>
            {(search || startDate || endDate || statusFilter !== "all") && (
              <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setStatusFilter("all"); }}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition whitespace-nowrap cursor-pointer" title="ล้างตัวกรอง">
                {lang === "th" ? "ล้าง" : "Reset"}
              </button>
            )}
          </div>
        </div>

        {/* Quick Date Filter Pills + Archive Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold mr-1">{lang === "th" ? "ช่วงเวลาด่วน:" : "Quick Date:"}</span>
            <button onClick={() => setQuickDate("today")} className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${startDate && startDate === endDate ? "bg-[#0071e3] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {lang === "th" ? "วันนี้" : "Today"}
            </button>
            <button onClick={() => setQuickDate("7days")} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition cursor-pointer">
              {lang === "th" ? "7 วันล่าสุด" : "Last 7 Days"}
            </button>
            <button onClick={() => setQuickDate("month")} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition cursor-pointer">
              {lang === "th" ? "เดือนนี้" : "This Month"}
            </button>
            <button onClick={() => setQuickDate("all")} className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${!startDate && !endDate ? "bg-[#0071e3] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {lang === "th" ? "ทั้งหมด" : "All Time"}
            </button>

            {/* Archive Toggle */}
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`ml-2 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${showArchived ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              <span>🗂️</span>
              <span>{showArchived ? (lang === "th" ? "ซ่อน Archive" : "Hide Archived") : (lang === "th" ? "แสดง Archive" : "Show Archived")}</span>
            </button>
          </div>

          {/* Per-page selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">{lang === "th" ? "แสดงหน้าละ:" : "Per page:"}</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:border-[#0071e3] cursor-pointer">
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
              <option value={100}>100 รายการ</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card !p-5">
          <div className="text-xs text-slate-500 font-semibold">{lang === "th" ? "จำนวนใบเสนอราคา" : "Quotations"}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--navy-900)] mt-1">{filteredRows.length}</div>
        </div>
        <div className="card !p-5 ring-2 ring-[var(--orange-500)]">
          <div className="text-xs text-slate-500 font-semibold">{lang === "th" ? "ประหยัดได้รวม (Saving)" : "Total Saving"}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--orange-600)] mt-1 break-words">฿{fmtBaht(totalSaving, lang)}</div>
        </div>
        <div className="card !p-5">
          <div className="text-xs text-slate-500 font-semibold">{lang === "th" ? "Saving เฉลี่ย/ใบ" : "Avg Saving"}</div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-700 mt-1 break-words">฿{fmtBaht(filteredRows.length ? totalSaving / filteredRows.length : 0, lang)}</div>
        </div>
      </div>

      {/* Bulk Action Toolbar — appears when ≥1 selected */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 bg-[#eef4ff] border border-[#bdd3fa] rounded-2xl shadow-sm">
          <span className="text-sm font-extrabold text-[#0071e3]">
            เลือกแล้ว {selectedIds.size} รายการ
          </span>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              onClick={handleBulkExport}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-700 text-white text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-60"
            >
              {bulkWorking ? <span className="animate-spin">⏳</span> : <span>📥</span>}
              <span>Export PDF (ZIP)</span>
            </button>
            <button
              onClick={() => setBulkModal({ type: showArchived ? "unarchive" : "archive", ids: Array.from(selectedIds) })}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-300 text-xs font-extrabold transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <span>🗂️</span>
              <span>{showArchived ? "ยกเลิก Archive" : "Archive"}</span>
            </button>
            <button
              onClick={() => setBulkModal({ type: "delete", ids: Array.from(selectedIds) })}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 text-xs font-extrabold transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <span>🗑️</span>
              <span>ลบ</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              ✕ ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Quotation Data Table */}
      <div className="card !p-0 overflow-hidden shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0b132a] text-white text-xs font-semibold">
              <tr>
                {/* Select-All Checkbox */}
                <th className="px-3 py-3.5 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition cursor-pointer"
                    style={{
                      borderColor: allPageSelected || somePageSelected ? "#0071e3" : "#64748b",
                      backgroundColor: allPageSelected ? "#0071e3" : somePageSelected ? "#e0eeff" : "transparent",
                    }}
                    title={allPageSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมดในหน้านี้"}
                  >
                    {allPageSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {!allPageSelected && somePageSelected && <div className="w-2 h-0.5 bg-[#0071e3]" />}
                  </button>
                </th>
                <th className="text-left px-5 py-3.5">{lang === "th" ? "เลขที่ / วันที่สร้าง" : "Quotation No. / Date"}</th>
                <th className="text-left px-5 py-3.5">{lang === "th" ? "ลูกค้า / ทะเบียน" : "Customer / Plate"}</th>
                <th className="text-left px-5 py-3.5">{lang === "th" ? "ผู้ทำรายการ" : "Created By"}</th>
                <th className="text-right px-5 py-3.5">{lang === "th" ? "ราคาเสนอ" : "Quoted"}</th>
                <th className="text-right px-5 py-3.5">{lang === "th" ? "หลังประกันอนุมัติ" : "Approved"}</th>
                <th className="text-right px-5 py-3.5">Saving</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "สถานะ" : "Status"}</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">กำลังโหลดข้อมูล…</td></tr>
              ) : pagedRows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                  {lang === "th" ? "ไม่พบใบเสนอราคาตรงตามเงื่อนไขที่ค้นหา" : "No quotations match search criteria"}
                </td></tr>
              ) : pagedRows.map((r) => {
                const isCompleted = r.status === "completed" || r.status === "finalized" || r.status === "approved";
                const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
                const timeStr = createdDate.toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
                const creator = r.createdByName || "ผู้ดูแลระบบ (Super Admin)";
                const isSelected = selectedIds.has(r.id);

                return (
                  <tr key={r.id} className={`border-t border-slate-100 transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/80"}`}>
                    {/* Row Checkbox */}
                    <td className="px-3 py-3.5">
                      <button
                        onClick={() => toggleRow(r.id)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center transition cursor-pointer"
                        style={{
                          borderColor: isSelected ? "#0071e3" : "#cbd5e1",
                          backgroundColor: isSelected ? "#0071e3" : "transparent",
                        }}
                      >
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={`/quotations/${r.id}`} className="font-mono text-xs font-extrabold text-[#0071e3] hover:underline">
                        {r.quotationNo}
                      </Link>
                      {r.isArchived && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">🗂️ Archive</span>
                      )}
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">🕒 {timeStr} น.</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{r.customerName || "—"}</div>
                      <div className="text-xs text-slate-500 font-medium">{r.licensePlate} · {r.vehicleBrand}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                        <span>{creator.includes("Admin") || creator.includes("ผู้ดูแล") ? "👑" : "👤"}</span>
                        <span>{creator}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {r.branchName || r.branch?.name || "สำนักงานใหญ่"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700 whitespace-nowrap font-mono">฿{fmtBaht(r.totalQuoted, lang)}</td>
                    <td className="px-5 py-3.5 text-right text-emerald-700 font-bold whitespace-nowrap font-mono">฿{fmtBaht(r.totalControlled, lang)}</td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-orange-600 whitespace-nowrap font-mono">฿{fmtBaht(r.totalSaving, lang)}</td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {r.status === "approved" || r.status === "finalized" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">✓ {lang === "th" ? "อนุมัติเสร็จสิ้น" : "Approved"}</span>
                      ) : r.status === "pending_approval" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs animate-pulse">⏳ {lang === "th" ? "รอ Supervisor อนุมัติ" : "Pending Approval"}</span>
                      ) : r.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-300 shadow-xs">❌ {lang === "th" ? "ตีกลับแก้ไข" : "Rejected"}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">📝 {lang === "th" ? "บันทึกร่าง" : "Draft"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {r.status === "pending_approval" ? (
                        <Link href={`/quotations/${r.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] text-white hover:bg-blue-700 text-xs font-extrabold transition shadow-md shadow-blue-500/20 cursor-pointer animate-pulse">
                          🛡️ {lang === "th" ? "ตรวจอนุมัติ" : "Review & Approve"}
                        </Link>
                      ) : (
                        <Link href={`/quotations/${r.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-[#0071e3] hover:bg-[#0071e3] hover:text-white text-xs font-bold transition shadow-2xs">
                          {lang === "th" ? "รายงาน" : "Report"}
                        </Link>
                      )}
                      {isCompleted ? (
                        <span className="ml-2 text-slate-300 text-xs font-semibold cursor-not-allowed select-none opacity-50">
                          {lang === "th" ? "แก้ไข" : "Edit"}
                        </span>
                      ) : (
                        <Link href={`/quotation/new?id=${r.id}`} className="ml-2 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:underline">
                          {lang === "th" ? "แก้ไข" : "Edit"}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Controls Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              {lang === "th"
                ? `แสดง ${filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredRows.length)} จากทั้งหมด ${filteredRows.length} รายการ`
                : `Showing ${filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredRows.length)} of ${filteredRows.length} items`}
            </span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-slate-500 font-bold">{lang === "th" ? "แสดงหน้าละ:" : "Per page:"}</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs">
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition shadow-2xs cursor-pointer">
              ← {lang === "th" ? "ถอยหลัง" : "Prev"}
            </button>
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-slate-400 font-bold">…</span>}
                    <button onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold transition cursor-pointer ${currentPage === p ? "bg-[#0071e3] text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                      {p}
                    </button>
                  </span>
                ))}
            </div>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition shadow-2xs cursor-pointer">
              {lang === "th" ? "ถัดไป" : "Next"} →
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Confirmation Modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-slate-100">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">
                {bulkModal.type === "delete" ? "🗑️" : bulkModal.type === "archive" ? "🗂️" : "📂"}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                {bulkModal.type === "delete" ? "ยืนยันการลบ" : bulkModal.type === "archive" ? "ยืนยัน Archive" : "ยืนยันยกเลิก Archive"}
              </h2>
              <p className="text-sm text-slate-500">
                {bulkModal.type === "delete"
                  ? `คุณต้องการลบ ${bulkModal.ids.length} รายการนี้ถาวรใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
                  : bulkModal.type === "archive"
                  ? `ย้าย ${bulkModal.ids.length} รายการไปที่ Archive จะซ่อนออกจากรายการปกติ แต่ยังค้นหาได้`
                  : `นำ ${bulkModal.ids.length} รายการกลับออกจาก Archive ไปยังรายการปกติ`}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBulkModal(null)} disabled={bulkWorking}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition cursor-pointer disabled:opacity-60">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (bulkModal.type === "delete") handleBulkDelete();
                  else if (bulkModal.type === "archive") handleBulkArchive(false);
                  else handleBulkArchive(true);
                }}
                disabled={bulkWorking}
                className={`flex-1 px-4 py-2.5 rounded-xl font-extrabold text-sm transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${bulkModal.type === "delete" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#0071e3] hover:bg-blue-700 text-white"}`}
              >
                {bulkWorking && <span className="animate-spin text-xs">⏳</span>}
                {bulkModal.type === "delete" ? "ลบถาวร" : bulkModal.type === "archive" ? "ย้าย Archive" : "ยกเลิก Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
