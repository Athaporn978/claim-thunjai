"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import AuditLogDrawer from "@/components/AuditLogDrawer";

type Role = { id: string; code: string; name: string; description?: string | null };

export default function WorkflowSettingsPage() {
  const { lang } = useLang();
  const [enabled, setEnabled] = useState(true);
  const [ruleMode, setRuleMode] = useState("THRESHOLD"); // "ALL" | "THRESHOLD" | "DIRECT"
  const [thresholdAmount, setThresholdAmount] = useState(50000);
  const [approverRoleIds, setApproverRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingRes, rolesRes] = await Promise.all([
        fetch("/api/admin/workflow-settings").then((r) => r.json()),
        fetch("/api/admin/roles").then((r) => r.json()),
      ]);

      if (settingRes.settings) {
        setEnabled(settingRes.settings.enabled ?? true);
        setRuleMode(settingRes.settings.ruleMode || "THRESHOLD");
        setThresholdAmount(settingRes.settings.thresholdAmount || 50000);
        setApproverRoleIds(settingRes.settings.approverRoleIds || []);
      }

      setRoles(rolesRes.roles || []);
    } catch {
      // default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRole = (roleId: string) => {
    setApproverRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/workflow-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          ruleMode,
          thresholdAmount: Number(thresholdAmount) || 0,
          approverRoleIds,
        }),
      });

      if (res.ok) {
        setShowSuccessModal(true);
      } else {
        alert("ไม่สามารถบันทึกการตั้งค่า Workflow ได้");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-[#0071e3] text-xs font-extrabold">
            {lang === "th" ? "ตั้งค่า & การจัดการผู้ใช้" : "Settings & User Management"}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--navy-900)]">
          {lang === "th" ? "ตั้งค่าระบบ Workflow อนุมัติ" : "Workflow Approval Settings"}
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          {lang === "th"
            ? "กำหนดเงื่อนไขการส่งอนุมัติเอกสารคุมราคา วงเงินในการอนุมัติ และผูกบทบาท Supervisor ผู้มีสิทธิ์อนุมัติ"
            : "Configure approval rules, threshold amounts, and approver role bindings"}
        </p>
      </div>

      {/* Success Modal Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 transform transition-all scale-100">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              ✓
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                {lang === "th" ? "บันทึกการตั้งค่าเรียบร้อยแล้ว" : "Settings Saved Successfully"}
              </h3>
              <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                {lang === "th"
                  ? "เงื่อนไขระบบ Workflow อนุมัติ วงเงินคุมราคา และสิทธิ์บทบาทผู้อนุมัติถูกอัปเดตและบังคับใช้กับทุกรายการในระบบเรียบร้อยแล้ว"
                  : "Workflow rules, thresholds, and approver role bindings have been updated globally across all items."}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 rounded-2xl bg-[#0071e3] hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer active:scale-98"
              >
                {lang === "th" ? "ตกลง (OK)" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-16 text-slate-400 text-sm font-medium">กำลังโหลดการตั้งค่า…</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Switch Box */}
          <div className="card !p-6 shadow-xs border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                เปิดใช้งานระบบ Workflow อนุมัติเอกสาร (Enable Approval Workflow)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เมื่อเปิดใช้งาน ใบเสนอราคาคุมราคาจะถูกส่งไปยัง Supervisor เพื่อพิจารณาตามเงื่อนไขที่กำหนด
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#0071e3]"></div>
            </label>
          </div>

          {/* Rule Modes Box */}
          <div className={`card !p-6 shadow-xs border border-slate-200 space-y-5 transition-opacity ${enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
            <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>⚙️</span> เลือกรูปแบบเงื่อนไขการอนุมัติ (Approval Rule Mode)
            </h2>

            <div className="space-y-3">
              {/* Option 1: ALL */}
              <label
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  ruleMode === "ALL" ? "border-[#0071e3] bg-blue-50/40" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="ruleMode"
                  value="ALL"
                  checked={ruleMode === "ALL"}
                  onChange={() => setRuleMode("ALL")}
                  className="mt-1 accent-[#0071e3]"
                />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">1. บังคับอนุมัติทุกรายการ (Always Require Approval)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ใบเสนอราคาที่พนักงานคุมราคาเสร็จสิ้นแล้วทุกเคส จะต้องส่งให้ Supervisor อนุมัติก่อนเสมอ 100%
                  </div>
                </div>
              </label>

              {/* Option 2: THRESHOLD */}
              <label
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  ruleMode === "THRESHOLD" ? "border-[#0071e3] bg-blue-50/40" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="ruleMode"
                  value="THRESHOLD"
                  checked={ruleMode === "THRESHOLD"}
                  onChange={() => setRuleMode("THRESHOLD")}
                  className="mt-1 accent-[#0071e3]"
                />
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-slate-900">2. อนุมัติเฉพาะรายการที่ยอดเงินเกินวงเงินกำหนด (Amount Threshold Rule)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    หากยอดอนุมัติคุมราคาซ่อมไม่เกินวงเงินที่กำหนด พนักงานสามารถอนุมัติจบเคสได้ทันที หากเกินจะส่งให้ Supervisor อนุมัติ
                  </div>

                  {ruleMode === "THRESHOLD" && (
                    <div className="mt-3 bg-white p-3 rounded-xl border border-blue-200 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700">ระบุวงเงินคุมราคาเกิน (บาท):</span>
                      <input
                        type="number"
                        value={thresholdAmount}
                        onChange={(e) => setThresholdAmount(Number(e.target.value))}
                        placeholder="50000"
                        className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-sm focus:outline-none focus:border-[#0071e3] w-44"
                      />
                      <span className="text-xs text-slate-500 font-bold">บาท (เคสที่เกิน {Number(thresholdAmount).toLocaleString()} บาทต้องส่งอนุมัติ)</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: DIRECT */}
              <label
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  ruleMode === "DIRECT" ? "border-[#0071e3] bg-blue-50/40" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="ruleMode"
                  value="DIRECT"
                  checked={ruleMode === "DIRECT"}
                  onChange={() => setRuleMode("DIRECT")}
                  className="mt-1 accent-[#0071e3]"
                />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">3. ปิดขั้นตอนการอนุมัติ (Direct Approval)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    พนักงานคุมราคาเสร็จสิ้นแล้วสามารถกดอนุมัติจบเคสได้เองทันทีโดยไม่ต้องผ่าน Supervisor
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Role Binding Box */}
          <div className={`card !p-6 shadow-xs border border-slate-200 space-y-4 transition-opacity ${enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>🔑</span> ผูกบทบาทที่มีสิทธิ์เป็น Supervisor อนุมัติ (Approver Roles)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกบทบาทในระบบที่จะสามารถมองเห็นปุ่ม "อนุมัติ" และ "ตีกลับ" เอกสารใบเสนอราคา
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {roles.map((r) => {
                const isChecked = approverRoleIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                      isChecked ? "border-[#0071e3] bg-blue-50/60 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleRole(r.id)}
                      className="w-4 h-4 rounded text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">🔑 {r.name} ({r.code})</div>
                      {r.description && <div className="text-[10px] text-slate-500">{r.description}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm !py-3.5 !px-8 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า Workflow ทั้งระบบ"}
            </button>
          </div>
        </form>
      )}

      {/* System Audit Log Drawer */}
      <AuditLogDrawer module="WORKFLOW_SETTING" />
    </div>
  );
}
