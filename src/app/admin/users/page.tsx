"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useLang } from "@/lib/LangContext";
import AuditLogDrawer from "@/components/AuditLogDrawer";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  code: string;
  name: string;
  email: string;
  password?: string | null;
  phone: string | null;
  branchId: string | null;
  roleId: string | null;
  status: string;
  branch?: { id: string; name: string; code: string } | null;
  role?: { id: string; name: string; code: string } | null;
};

type Branch = { id: string; name: string; code: string };
type Role = { id: string; name: string; code: string };

type ImportRowPreview = {
  lineNo: number;
  code: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  branchInput: string;
  roleInput: string;
  statusInput: string;
  matchedBranchName?: string;
  matchedRoleName?: string;
  isValid: boolean;
  errorReason?: string;
};

export default function EmployeesPage() {
  const { lang } = useLang();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Single Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    branchId: "",
    roleId: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  // View Only Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Employee | null>(null);

  // Bulk Import Excel Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRowPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, brRes, rlRes] = await Promise.all([
        fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { employees: [] })).catch(() => ({ employees: [] })),
        fetch("/api/admin/branches").then((r) => (r.ok ? r.json() : { branches: [] })).catch(() => ({ branches: [] })),
        fetch("/api/admin/roles").then((r) => (r.ok ? r.json() : { roles: [] })).catch(() => ({ roles: [] })),
      ]);

      setEmployees(empRes.employees || []);
      setBranches(brRes.branches || []);
      setRoles(rlRes.roles || []);
    } catch (err) {
      console.error("Load users page error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered employees
  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.branch && e.branch.name.toLowerCase().includes(q)) ||
        (e.role && e.role.name.toLowerCase().includes(q))
    );
  }, [employees, search]);

  const openAdd = () => {
    setEditItem(null);
    setShowPassword(false);

    // Auto-generate code
    let nextSeq = employees.length + 1;
    let codeStr = `EMP-${String(nextSeq).padStart(3, "0")}`;
    while (employees.some((e) => e.code.toLowerCase() === codeStr.toLowerCase())) {
      nextSeq++;
      codeStr = `EMP-${String(nextSeq).padStart(3, "0")}`;
    }

    setForm({
      code: codeStr,
      name: "",
      email: "",
      password: "password123",
      phone: "",
      branchId: branches[0]?.id || "",
      roleId: roles[0]?.id || "",
      status: "active",
    });
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditItem(emp);
    setShowPassword(false);
    setForm({
      code: emp.code,
      name: emp.name,
      email: emp.email,
      password: emp.password || "",
      phone: emp.phone || "",
      branchId: emp.branchId || "",
      roleId: emp.roleId || "",
      status: emp.status || "active",
    });
    setModalOpen(true);
  };

  const openView = async (emp: Employee) => {
    setViewItem(emp);
    setViewModalOpen(true);

    // Record audit log for VIEW action
    try {
      await fetch("/api/admin/users/audit-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.id }),
      });
    } catch (err) {
      console.error("View audit log error:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/users/${editItem.id}` : "/api/admin/users";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "เกิดข้อผิดพลาดในการบันทึก");
        return;
      }

      setModalOpen(false);
      load();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานรายนี้?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        load();
      } else {
        const data = await res.json();
        alert(data.error || "เกิดข้อผิดพลาดในการลบ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + String(err));
    }
  };

  // Excel Template Download
  const downloadTemplate = () => {
    const templateData = [
      {
        "รหัสพนักงาน (ถ้าเว้นไว้ระบบรันให้ออโต้)": "EMP-001",
        "ชื่อ - นามสกุล": "อรรถพล โชคชัย",
        "อีเมล (ใช้เป็นบัญชีเข้าระบบ)": "athaporn@htechnology.com",
        "รหัสผ่าน (Password)": "password123",
        "เบอร์โทรศัพท์": "065-882-8333",
        "ชื่อสาขา (ต้องตรงกับระบบ)": branches[0]?.name || "สำนักงานใหญ่ (กรุงเทพมหานคร)",
        "ชื่อบทบาท (ต้องตรงกับระบบ)": roles[0]?.name || "Super Administrator",
        "สถานะ (active/suspended)": "active",
      },
      {
        "รหัสพนักงาน (ถ้าเว้นไว้ระบบรันให้ออโต้)": "",
        "ชื่อ - นามสกุล": "สมชาย ใจดี",
        "อีเมล (ใช้เป็นบัญชีเข้าระบบ)": "somchai@claimthunjai.com",
        "รหัสผ่าน (Password)": "password123",
        "เบอร์โทรศัพท์": "081-234-5678",
        "ชื่อสาขา (ต้องตรงกับระบบ)": branches[0]?.name || "สำนักงานใหญ่ (กรุงเทพมหานคร)",
        "ชื่อบทบาท (ต้องตรงกับระบบ)": roles[1]?.name || roles[0]?.name || "เจ้าหน้าที่คุมราคา",
        "สถานะ (active/suspended)": "active",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "พนักงาน");

    worksheet["!cols"] = [
      { wch: 32 },
      { wch: 25 },
      { wch: 32 },
      { wch: 20 },
      { wch: 16 },
      { wch: 32 },
      { wch: 28 },
      { wch: 22 },
    ];

    XLSX.writeFile(workbook, "แบบฟอร์มนำเข้าพนักงาน_ClaimThunJai.xlsx");
  };

  // Handle Excel Upload Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          alert("ไม่พบข้อมูลในไฟล์ Excel กรุณาตรวจสอบไฟล์แม่แบบ");
          return;
        }

        const branchMap = new Map<string, string>();
        branches.forEach((b) => {
          branchMap.set(b.code.trim().toLowerCase(), b.name);
          branchMap.set(b.name.trim().toLowerCase(), b.name);
        });

        const roleMap = new Map<string, string>();
        roles.forEach((r) => {
          roleMap.set(r.code.trim().toLowerCase(), r.name);
          roleMap.set(r.name.trim().toLowerCase(), r.name);
        });

        const existingCodes = new Set(employees.map((emp) => emp.code.trim().toLowerCase()));
        const existingEmails = new Set(employees.map((emp) => emp.email.trim().toLowerCase()));

        let autoSeqIndex = employees.length + 1;

        const parsedPreviews: ImportRowPreview[] = rawJson.map((row, idx) => {
          let code = String(row["รหัสพนักงาน (ถ้าเว้นไว้ระบบรันให้ออโต้)"] || row["รหัสพนักงาน"] || row["code"] || "").trim();
          const name = String(row["ชื่อ - นามสกุล"] || row["ชื่อพนักงาน"] || row["name"] || "").trim();
          const email = String(row["อีเมล (ใช้เป็นบัญชีเข้าระบบ)"] || row["อีเมล"] || row["email"] || "").trim();
          const password = String(row["รหัสผ่าน (Password)"] || row["password"] || "").trim() || "password123";
          const phone = String(row["เบอร์โทรศัพท์"] || row["phone"] || "").trim();
          const branchInput = String(row["ชื่อสาขา (ต้องตรงกับระบบ)"] || row["สาขา"] || row["branch"] || "").trim();
          const roleInput = String(row["ชื่อบทบาท (ต้องตรงกับระบบ)"] || row["บทบาท"] || row["role"] || "").trim();
          const statusInput = String(row["สถานะ (active/suspended)"] || row["สถานะ"] || row["status"] || "active").trim();

          if (!code) {
            code = `EMP-${String(autoSeqIndex).padStart(3, "0")} (Auto)`;
            autoSeqIndex++;
          }

          let isValid = true;
          let errorReason = "";

          if (!name || !email) {
            isValid = false;
            errorReason = "ข้อมูลไม่ครบ (ต้องมี ชื่อ-นามสกุล และ อีเมล)";
          } else {
            const matchedBranch = branchMap.get(branchInput.toLowerCase());
            const matchedRole = roleMap.get(roleInput.toLowerCase());

            if (!branchInput || !matchedBranch) {
              isValid = false;
              errorReason = `ไม่พบสาขา "${branchInput || "未ระบุ"}" (ต้องสร้างสาขาก่อน)`;
            } else if (!roleInput || !matchedRole) {
              isValid = false;
              errorReason = `ไม่พบบทบาท "${roleInput || "未ระบุ"}" (ต้องสร้างบทบาทก่อน)`;
            } else if (existingCodes.has(code.toLowerCase())) {
              isValid = false;
              errorReason = `รหัสพนักงาน "${code}" ซ้ำในระบบ`;
            } else if (existingEmails.has(email.toLowerCase())) {
              isValid = false;
              errorReason = `อีเมล "${email}" ซ้ำในระบบ`;
            }

            return {
              lineNo: idx + 1,
              code,
              name,
              email,
              password,
              phone,
              branchInput,
              roleInput,
              statusInput,
              matchedBranchName: matchedBranch,
              matchedRoleName: matchedRole,
              isValid,
              errorReason,
            };
          }

          return {
            lineNo: idx + 1,
            code,
            name,
            email,
            password,
            phone,
            branchInput,
            roleInput,
            statusInput,
            isValid,
            errorReason,
          };
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

  const submitBulkImport = async () => {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("ไม่มีข้อมูลแถวที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            code: r.code.includes("(Auto)") ? "" : r.code,
            name: r.name,
            email: r.email,
            password: r.password,
            phone: r.phone,
            branch: r.branchInput,
            role: r.roleInput,
            status: r.statusInput,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`นำเข้าข้อมูลพนักงานสำเร็จจำนวน ${data.importedCount} รายการ!`);
        setImportModalOpen(false);
        load();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + String(err));
    } finally {
      setImporting(false);
    }
  };

  const validCount = importRows.filter((r) => r.isValid).length;
  const invalidCount = importRows.length - validCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-[#0071e3] text-xs font-extrabold">
              {lang === "th" ? "ตั้งค่า & การจัดการผู้ใช้" : "Settings & User Management"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--navy-900)]">
            {lang === "th" ? "จัดการข้อมูลพนักงาน & สิทธิ์เข้าใช้" : "Employee Credentials & Access"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {lang === "th"
              ? "จัดการข้อมูลพนักงาน กำหนดอีเมล รหัสผ่าน (Password) สาขา และบทบาทในระบบ"
              : "Manage employees, email logins, passwords, branches, and roles"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300/80 cursor-pointer flex items-center gap-1.5"
          >
            <span>📊</span>
            <span>ดาวน์โหลดแม่แบบ Excel</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs transition border border-emerald-300 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>📥</span>
            <span>นำเข้าข้อมูล bulk (Excel)</span>
          </button>

          <button
            onClick={openAdd}
            className="btn-primary text-xs !py-2.5 !px-5 shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>{lang === "th" ? "เพิ่มพนักงานใหม่" : "Add Employee"}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card !p-4 shadow-xs border border-slate-200">
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
            placeholder={lang === "th" ? "🔍 ค้นหาพนักงานด้วย รหัส, ชื่อ-นามสกุล, อีเมล, สาขา หรือ บทบาท…" : "Search by code, name, email, branch, role…"}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-medium"
          />
        </div>
      </div>

      {/* Employees Table */}
      <div className="card !p-0 overflow-hidden shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0b132a] text-white text-xs font-semibold">
              <tr>
                <th className="text-center px-4 py-3.5 w-16">{lang === "th" ? "ลำดับ" : "No."}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "ชื่อ - นามสกุล" : "Name"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "สาขาที่สังกัด" : "Branch"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "บทบาทในระบบ" : "Role"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "สถานะ" : "Status"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "จัดการ" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">กำลังโหลดข้อมูล…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">ไม่พบข้อมูลพนักงานที่ค้นหา</td></tr>
              ) : filtered.map((emp, index) => (
                <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{emp.name}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                    {emp.branch ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0071e3] border border-sky-200">
                        🏢 {emp.branch.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                    {emp.role ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                        🔑 {emp.role.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${emp.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-500"}`}>
                      {emp.status === "active" ? "✓ ปกติ" : "ระงับ"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Button */}
                      <button
                        onClick={() => openView(emp)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer border border-slate-300/80 shadow-2xs"
                        title="ดูรายละเอียดข้อมูลพนักงาน"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{lang === "th" ? "ดู" : "View"}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEdit(emp)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0071e3] hover:bg-[#0071e3] hover:text-white transition-all duration-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer border border-blue-200/60 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{lang === "th" ? "แก้ไข" : "Edit"}</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all duration-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer border border-rose-200/60 shadow-2xs"
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

      {/* Modal READ-ONLY VIEW EMPLOYEE */}
      {viewModalOpen && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>👁️</span> รายละเอียดข้อมูลพนักงาน (Read Only)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                🔒 โหมดอ่านอย่างเดียว
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสพนักงาน</label>
                <input
                  disabled
                  value={viewItem.code}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-slate-50 text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อ - นามสกุล</label>
                <input
                  disabled
                  value={viewItem.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-extrabold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">อีเมล (บัญชีเข้าใช้)</label>
                  <input
                    disabled
                    value={viewItem.email}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs bg-slate-50 text-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    disabled
                    value={viewItem.phone || "ไม่ระบุ"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สาขาที่สังกัด</label>
                <input
                  disabled
                  value={viewItem.branch ? `${viewItem.branch.name} (${viewItem.branch.code})` : "ไม่ระบุสาขา"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">บทบาทในระบบ</label>
                <input
                  disabled
                  value={viewItem.role ? `${viewItem.role.name} (${viewItem.role.code})` : "ไม่ระบุบทบาท"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-purple-700 font-extrabold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สถานะใช้งาน</label>
                <input
                  disabled
                  value={viewItem.status === "active" ? "✓ ปกติ (Active)" : "ระงับการใช้งาน (Suspended)"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-emerald-700 font-extrabold"
                />
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs transition shadow-md cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Single Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900">
              {editItem ? (lang === "th" ? "แก้ไขข้อมูลพนักงาน" : "Edit Employee") : (lang === "th" ? "เพิ่มพนักงานใหม่" : "Add Employee")}
            </h2>
            <form onSubmit={handleSave} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสพนักงาน *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. EMP-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อ - นามสกุล *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. สมชาย ใจดี"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">อีเมล (ใช้เข้าสู่ระบบ) *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="somchai@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-[#0071e3]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน (Password)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-[#0071e3]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? (
                        /* Official Eye Slash Icon */
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 013.98-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-3-3m-6.312-3.116A3 3 0 0012 9a2.983 2.983 0 00-2.116.884m0 0L3 3" />
                        </svg>
                      ) : (
                        /* Official Eye Open Icon */
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="081-xxx-xxxx"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ผูกกับสาขา (Branch)</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-bold"
                >
                  <option value="">-- ไม่ระบุสาขา --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>🏢 {b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ผูกกับบทบาท (Role)</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-bold"
                >
                  <option value="">-- ไม่ระบุบทบาท --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>🔑 {r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">สถานะ</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-bold"
                >
                  <option value="active">✓ ปกติ (Active)</option>
                  <option value="suspended">ระงับการใช้งาน (Suspended)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs !py-2.5 !px-6"
                >
                  {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Excel Import Preview */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📊</span> ตัวอย่างข้อมูลที่จะนำเข้าพนักงาน (Excel Import Preview)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตรวจสอบความถูกต้องก่อนบันทึกเข้าสู่ระบบ (พบข้อมูลทั้งหมด {importRows.length} รายการ)
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ พร้อมนำเข้า: {validCount} รายการ
                </span>
                {invalidCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    ✕ มีข้อผิดพลาด: {invalidCount} รายการ
                  </span>
                )}
              </div>
            </div>

            {/* Table Preview */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-center">แถว</th>
                    <th className="px-3 py-2.5 text-left">รหัส</th>
                    <th className="px-3 py-2.5 text-left">ชื่อ-นามสกุล</th>
                    <th className="px-3 py-2.5 text-left">อีเมล (บัญชีเข้าใช้)</th>
                    <th className="px-3 py-2.5 text-left">สาขาในระบบ</th>
                    <th className="px-3 py-2.5 text-left">บทบาทในระบบ</th>
                    <th className="px-3 py-2.5 text-center">ผลการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r) => (
                    <tr key={r.lineNo} className={`border-t border-slate-100 ${r.isValid ? "hover:bg-emerald-50/40" : "bg-rose-50/50"}`}>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-400">{r.lineNo}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#0071e3]">{r.code}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{r.email}</td>
                      <td className="px-3 py-2 font-medium">
                        {r.matchedBranchName ? (
                          <span className="text-emerald-700 font-bold">🏢 {r.matchedBranchName}</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✕ {r.branchInput}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {r.matchedRoleName ? (
                          <span className="text-purple-700 font-bold">🔑 {r.matchedRoleName}</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✕ {r.roleInput}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.isValid ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ✓ ถูกต้อง
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]" title={r.errorReason}>
                            ✕ {r.errorReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
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
                  {importing ? "กำลังนำเข้าข้อมูล…" : `🚀 ยืนยันนำเข้าข้อมูล (${validCount} รายการ)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Audit Log Drawer */}
      <AuditLogDrawer module="EMPLOYEE" />
    </div>
  );
}
