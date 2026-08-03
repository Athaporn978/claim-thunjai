"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useLang } from "@/lib/LangContext";
import AuditLogDrawer from "@/components/AuditLogDrawer";
import * as XLSX from "xlsx";

type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: string;
  _count?: { employees: number };
};

type BranchImportPreview = {
  lineNo: number;
  code: string;
  name: string;
  address: string;
  phone: string;
  statusInput: string;
  isValid: boolean;
  errorReason?: string;
};

export default function BranchesPage() {
  const { lang } = useLang();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Single Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const [form, setForm] = useState({ code: "", name: "", address: "", phone: "", status: "active" });
  const [saving, setSaving] = useState(false);

  // Bulk Import Excel Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<BranchImportPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read-only Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Branch | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/branches")
      .then((r) => (r.ok ? r.json() : { branches: [] }))
      .then((d) => setBranches(d?.branches || []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ code: `BR-0${branches.length + 1}`, name: "", address: "", phone: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditItem(b);
    setForm({ code: b.code, name: b.name, address: b.address || "", phone: b.phone || "", status: b.status });
    setModalOpen(true);
  };

  const openView = async (b: Branch) => {
    setViewItem(b);
    setViewModalOpen(true);
    try {
      await fetch("/api/admin/branches/audit-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: b.id }),
      });
    } catch (err) {
      console.error("View audit log error:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/branches/${editItem.id}` : "/api/admin/branches";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setModalOpen(false);
        load();
      } else {
        alert(data.error || (lang === "th" ? "ไม่สามารถบันทึกข้อมูลสาขาได้" : "Failed to save branch"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "th" ? "คุณแน่ใจหรือไม่ว่าต้องการลบสาขานี้?" : "Are you sure you want to delete this branch?")) return;
    await fetch(`/api/admin/branches/${id}`, { method: "DELETE" });
    load();
  };

  // Download Sample Excel Template for Branches
  const downloadTemplate = () => {
    const sampleData = [
      {
        "ชื่อสาขา (name)": "สาขาขอนแก่น (ภาคอีสาน)",
        "ที่อยู่ (address)": "99 ถนนมิตรภาพ เมือง ขอนแก่น 40000",
        "เบอร์โทร (phone)": "043-123-456",
        "สถานะ (status)": "ปกติ",
        "รหัสสาขา (ถ้ามี/เว้นว่างเพื่อสร้างอัตโนมัติ)": "",
      },
      {
        "ชื่อสาขา (name)": "สาขาชลบุรี (ภาคตะวันออก)",
        "ที่อยู่ (address)": "55 ถนนสุขุมวิท เมือง ชลบุรี 20000",
        "เบอร์โทร (phone)": "038-987-654",
        "สถานะ (status)": "ปกติ",
        "รหัสสาขา (ถ้ามี/เว้นว่างเพื่อสร้างอัตโนมัติ)": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "สาขา");
    XLSX.writeFile(workbook, "แบบฟอร์มนำเข้าสาขา_ClaimThunJai.xlsx");
  };

  // Process Excel File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          alert("ไฟล์ Excel ไม่มีข้อมูลรายการสาขา");
          return;
        }

        const existingCodes = new Set(branches.map((b) => b.code.trim().toLowerCase()));
        const existingNames = new Set(branches.map((b) => b.name.trim().toLowerCase()));

        const parsedPreviews: BranchImportPreview[] = [];
        const inBatchCodes = new Set<string>();
        const inBatchNames = new Set<string>();
        let autoSeqIndex = branches.length + 1;

        rawJson.forEach((row, i) => {
          const lineNo = i + 1;
          let code = String(row["รหัสสาขา (code)"] || row["รหัสสาขา"] || row["code"] || row["รหัสสาขา (ถ้ามี/เว้นว่างเพื่อสร้างอัตโนมัติ)"] || "").trim();
          const name = String(row["ชื่อสาขา (name)"] || row["ชื่อสาขา"] || row["name"] || "").trim();
          const address = String(row["ที่อยู่ (address)"] || row["ที่อยู่"] || row["address"] || "").trim();
          const phone = String(row["เบอร์โทร (phone)"] || row["เบอร์โทรศัพท์"] || row["เบอร์โทร"] || row["phone"] || "").trim();
          const statusInput = String(row["สถานะ (status)"] || row["สถานะ"] || row["status"] || "ปกติ").trim();

          // Auto-generate branch code if omitted
          if (!code) {
            let generated = `BR-${String(autoSeqIndex).padStart(2, "0")}`;
            while (existingCodes.has(generated.toLowerCase()) || inBatchCodes.has(generated.toLowerCase())) {
              autoSeqIndex++;
              generated = `BR-${String(autoSeqIndex).padStart(2, "0")}`;
            }
            code = generated;
            autoSeqIndex++;
          }

          let isValid = true;
          let errorReason = "";

          // Validation 1: Required Name
          if (!name) {
            isValid = false;
            errorReason = "ไม่ได้ระบุชื่อสาขา";
          }

          // Validation 2: Code & Name Duplicates
          if (isValid) {
            const codeLower = code.toLowerCase();
            const nameLower = name.toLowerCase();

            if (existingCodes.has(codeLower) || inBatchCodes.has(codeLower)) {
              isValid = false;
              errorReason = `รหัสสาขา "${code}" มีอยู่ในระบบหรือซ้ำในไฟล์`;
            } else if (existingNames.has(nameLower) || inBatchNames.has(nameLower)) {
              isValid = false;
              errorReason = `ชื่อสาขา "${name}" มีอยู่ในระบบหรือซ้ำในไฟล์`;
            } else {
              inBatchCodes.add(codeLower);
              inBatchNames.add(nameLower);
            }
          }

          parsedPreviews.push({
            lineNo,
            code,
            name,
            address,
            phone,
            statusInput,
            isValid,
            errorReason,
          });
        });

        setImportRows(parsedPreviews);
        setImportModalOpen(true);
      } catch (err) {
        alert("ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Submit Verified Bulk Branch Rows to API
  const submitBulkImport = async () => {
    const validRowsToSubmit = importRows.filter((r) => r.isValid).map((r) => ({
      code: r.code,
      name: r.name,
      address: r.address,
      phone: r.phone,
      status: r.statusInput,
    }));

    if (validRowsToSubmit.length === 0) {
      alert("ไม่มีรายการสาขาที่ผ่านเงื่อนไขสำหรับนำเข้า");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/branches/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRowsToSubmit }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`🎉 นำเข้าข้อมูลสาขาสำเร็จจำนวน ${data.importedCount} รายการ!`);
        setImportModalOpen(false);
        load();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูลสาขา");
      }
    } finally {
      setImporting(false);
    }
  };

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.phone && b.phone.toLowerCase().includes(q))
      );
    });
  }, [branches, search]);

  const validCount = useMemo(() => importRows.filter((r) => r.isValid).length, [importRows]);
  const invalidCount = useMemo(() => importRows.filter((r) => !r.isValid).length, [importRows]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hidden File Input for Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-[#0071e3] text-xs font-extrabold">
              {lang === "th" ? "การจัดการผู้ใช้" : "User Management"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--navy-900)]">
            {lang === "th" ? "จัดการสาขา" : "Branch Management"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {lang === "th" ? "เพิ่ม แก้ไข ค้นหา และนำเข้าข้อมูลสาขาทั่วประเทศผ่าน Excel" : "Manage company branches and locations via Excel"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="ดาวน์โหลดไฟล์ตัวอย่าง Excel สำหรับสาขา"
          >
            <span>📊</span> {lang === "th" ? "ดาวน์โหลดแม่แบบ Excel" : "Template"}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            title="นำเข้าสาขาทั่วประเทศจำนวนมากผ่าน Excel"
          >
            <span>📥</span> {lang === "th" ? "นำเข้าสาขาด้วย Excel" : "Bulk Upload"}
          </button>

          <button onClick={openAdd} className="btn-primary text-sm !py-2.5 !px-5 shadow-md shadow-blue-500/20 cursor-pointer">
            + {lang === "th" ? "เพิ่มสาขาใหม่" : "Add Branch"}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card !p-4 mb-6 shadow-xs border border-slate-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "th" ? "🔍 ค้นหาสาขาด้วย รหัสสาขา, ชื่อสาขา, ที่อยู่ หรือ เบอร์โทร…" : "Search by code, name, address, phone…"}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-medium"
          />
        </div>
      </div>

      {/* Branch Table */}
      <div className="card !p-0 overflow-hidden shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0b132a] text-white text-xs font-semibold">
              <tr>
                <th className="text-center px-4 py-3.5 w-16">{lang === "th" ? "ลำดับ" : "No."}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "ชื่อสาขา" : "Branch Name"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "ที่อยู่ที่ติดต่อ" : "Address / Contact"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "จำนวนพนักงาน" : "Employees"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "สถานะ" : "Status"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "จัดการ" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">กำลังโหลดข้อมูล…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">ไม่พบข้อมูลสาขาที่ค้นหา</td></tr>
              ) : filtered.map((b, index) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800 text-center">{b.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    <div>{b.address || "—"}</div>
                    {b.phone && <div className="text-slate-400 font-mono mt-0.5">📞 {b.phone}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">{b._count?.employees || 0} คน</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${b.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-500"}`}>
                      {b.status === "active" ? "✓ ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Button */}
                      <button
                        onClick={() => openView(b)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer border border-slate-300/80 shadow-2xs"
                        title="ดูรายละเอียดข้อมูลสาขา"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{lang === "th" ? "ดู" : "View"}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEdit(b)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0071e3] hover:bg-[#0071e3] hover:text-white transition-all duration-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border border-blue-200/60 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{lang === "th" ? "แก้ไข" : "Edit"}</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all duration-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border border-rose-200/60 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>{lang === "th" ? "ลบ" : "Delete"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Single Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">
              {editItem ? (lang === "th" ? "แก้ไขข้อมูลสาขา" : "Edit Branch") : (lang === "th" ? "เพิ่มสาขาใหม่" : "Add Branch")}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสสาขา *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. BR-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อสาขา *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. สาขาเชียงใหม่"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ที่อยู่</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="ที่อยู่สาขา..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="053-xxx-xxx"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">สถานะ</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-bold"
                >
                  <option value="active">✓ ใช้งาน (Active)</option>
                  <option value="inactive">ปิดใช้งาน (Inactive)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs !py-2 !px-5"
                >
                  {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal READ-ONLY VIEW BRANCH */}
      {viewModalOpen && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>👁️</span> รายละเอียดข้อมูลสาขา (Read Only)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                🔒 โหมดอ่านอย่างเดียว
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสสาขา</label>
                <input
                  disabled
                  value={viewItem.code}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-slate-50 text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อสาขา</label>
                <input
                  disabled
                  value={viewItem.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-extrabold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ที่อยู่ที่ติดต่อ</label>
                <textarea
                  disabled
                  rows={3}
                  value={viewItem.address || "—"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทรศัพท์</label>
                <input
                  disabled
                  value={viewItem.phone || "—"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-slate-50 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สถานะใช้งาน</label>
                <input
                  disabled
                  value={viewItem.status === "active" ? "✓ ใช้งานปกติ (Active)" : "ปิดใช้งาน (Inactive)"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-emerald-700 font-extrabold"
                />
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-extrabold transition text-xs cursor-pointer border border-slate-200"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bulk Excel Branch Import Preview */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📥</span> นำเข้าข้อมูลสาขาจาก Excel (Bulk Branch Import)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ตรวจสอบความถูกต้องของรายการสาขาทั่วประเทศก่อนยืนยันบันทึกลงฐานข้อมูล
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ พร้อมนำเข้า {validCount} สาขา
                </span>
                {invalidCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    ❌ ไม่ผ่านเงื่อนไข {invalidCount} สาขา
                  </span>
                )}
              </div>
            </div>

            {/* Table Scroll Preview */}
            <div className="flex-1 overflow-y-auto my-4 border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white sticky top-0 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5">รหัสสาขา</th>
                    <th className="px-3 py-2.5">ชื่อสาขา</th>
                    <th className="px-3 py-2.5">ที่อยู่</th>
                    <th className="px-3 py-2.5">เบอร์โทรศัพท์</th>
                    <th className="px-3 py-2.5 text-center">ผลการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {importRows.map((r) => (
                    <tr key={r.lineNo} className={r.isValid ? "bg-white hover:bg-slate-50" : "bg-rose-50/50 hover:bg-rose-50"}>
                      <td className="px-3 py-2 text-center text-slate-400 font-mono">{r.lineNo}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#0071e3]">{r.code}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{r.name || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{r.address || "—"}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{r.phone || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {r.isValid ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            ✓ พร้อมนำเข้า
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold" title={r.errorReason}>
                            ❌ {r.errorReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  📁 เลือกไฟล์อื่น
                </button>

                <button
                  type="button"
                  disabled={validCount === 0 || importing}
                  onClick={submitBulkImport}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {importing ? "กำลังนำเข้าข้อมูล…" : `🚀 ยืนยันนำเข้าข้อมูลสาขา (${validCount} รายการ)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Audit Log Drawer */}
      <AuditLogDrawer module="BRANCH" />
    </div>
  );
}
