"use client";
import { useEffect, useState, useMemo } from "react";
import { useLang } from "@/lib/LangContext";
import AuditLogDrawer from "@/components/AuditLogDrawer";

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string | null;
  status: string;
  _count?: { employees: number };
};

export default function RolesPage() {
  const { lang } = useLang();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Role | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", status: "active" });
  const [saving, setSaving] = useState(false);

  // Read-only Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Role | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/roles")
      .then((r) => (r.ok ? r.json() : { roles: [] }))
      .then((d) => setRoles(d?.roles || []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ code: `ROLE-0${roles.length + 1}`, name: "", description: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditItem(r);
    setForm({ code: r.code, name: r.name, description: r.description || "", status: r.status });
    setModalOpen(true);
  };

  const openView = async (r: Role) => {
    setViewItem(r);
    setViewModalOpen(true);
    try {
      await fetch("/api/admin/roles/audit-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: r.id }),
      });
    } catch (err) {
      console.error("View audit log error:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/roles/${editItem.id}` : "/api/admin/roles";
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
        alert(data.error || (lang === "th" ? "ไม่สามารถบันทึกข้อมูลบทบาทได้" : "Failed to save role"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "th" ? "คุณแน่ใจหรือไม่ว่าต้องการลบบทบาทนี้?" : "Are you sure you want to delete this role?")) return;
    await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = useMemo(() => {
    return roles.filter((r) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [roles, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-[#0071e3] text-xs font-extrabold">
              {lang === "th" ? "การจัดการผู้ใช้" : "User Management"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--navy-900)]">
            {lang === "th" ? "จัดการบทบาทหน้าที่ (Roles)" : "Role Management"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {lang === "th" ? "กำหนด เพิ่ม แก้ไข ค้นหา และควบคุมบทบาทขอบเขตหน้าที่ในระบบ" : "Define system roles and access levels"}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm !py-2.5 !px-6 shadow-md shadow-blue-500/20 cursor-pointer">
          + {lang === "th" ? "เพิ่มบทบาทใหม่" : "Add Role"}
        </button>
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
            placeholder={lang === "th" ? "🔍 ค้นหาบทบาทด้วย รหัสบทบาท, ชื่อบทบาท หรือ รายละเอียดขอบเขต…" : "Search by code, role name, description…"}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3] font-medium"
          />
        </div>
      </div>

      {/* Roles Table */}
      <div className="card !p-0 overflow-hidden shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0b132a] text-white text-xs font-semibold">
              <tr>
                <th className="text-center px-4 py-3.5 w-16">{lang === "th" ? "ลำดับ" : "No."}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "ชื่อบทบาท" : "Role Name"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "ขอบเขตหน้าที่รายละเอียด" : "Description"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "จำนวนพนักงาน" : "Employees"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "สถานะ" : "Status"}</th>
                <th className="text-center px-5 py-3.5">{lang === "th" ? "จัดการ" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">กำลังโหลดข้อมูล…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">ไม่พบข้อมูลบทบาทที่ค้นหา</td></tr>
              ) : filtered.map((r, index) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800 text-center">{r.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 max-w-md">{r.description || "—"}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">{r._count?.employees || 0} คน</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${r.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-500"}`}>
                      {r.status === "active" ? "✓ ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Button */}
                      <button
                        onClick={() => openView(r)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer border border-slate-300/80 shadow-2xs"
                        title="ดูรายละเอียดข้อมูลบทบาท"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{lang === "th" ? "ดู" : "View"}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEdit(r)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0071e3] hover:bg-[#0071e3] hover:text-white transition-all duration-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border border-blue-200/60 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{lang === "th" ? "แก้ไข" : "Edit"}</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(r.id)}
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

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">
              {editItem ? (lang === "th" ? "แก้ไขข้อมูลบทบาท" : "Edit Role") : (lang === "th" ? "เพิ่มบทบาทใหม่" : "Add Role")}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสบทบาท *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. ROLE-CONTROLLER"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อบทบาท *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. เจ้าหน้าที่คุมราคา"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">คำอธิบายหน้าที่ / ขอบเขต</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="รายละเอียดหน้าที่..."
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

      {/* Modal READ-ONLY VIEW ROLE */}
      {viewModalOpen && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>👁️</span> รายละเอียดข้อมูลบทบาท (Read Only)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                🔒 โหมดอ่านอย่างเดียว
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสบทบาท</label>
                <input
                  disabled
                  value={viewItem.code}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-slate-50 text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อบทบาท</label>
                <input
                  disabled
                  value={viewItem.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-extrabold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ขอบเขตหน้าที่รายละเอียด</label>
                <textarea
                  disabled
                  rows={3}
                  value={viewItem.description || "—"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 resize-none"
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

      {/* System Audit Log Drawer */}
      <AuditLogDrawer module="ROLE" />
    </div>
  );
}
