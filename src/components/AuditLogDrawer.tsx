"use client";
import { useEffect, useState } from "react";

type AuditLog = {
  id: string;
  module: string;
  action: string;
  entityName: string | null;
  details: string | null;
  performerName: string;
  createdAt: string;
};

export default function AuditLogDrawer({ module }: { module: "BRANCH" | "ROLE" | "EMPLOYEE" | "WORKFLOW_SETTING" }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?module=${module}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, module]);

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <span>📜</span> ประวัติบันทึกการใช้งาน (Audit Logs & Action History)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกประวัติการสร้าง, การแก้ไข, การลบ และการเปลี่ยนแปลงสิทธิ์โดยผู้ใช้งาน
          </p>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 border border-slate-300/80"
        >
          <span>{isOpen ? "🔼 ซ่อนประวัติ" : "🔽 แสดงประวัติบันทึก (Audit Log)"}</span>
          {logs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0071e3] text-[10px] font-black">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 card !p-5 shadow-xs border border-slate-200 space-y-4 animate-fade-in bg-slate-50/50">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-black text-slate-700">ประวัติบันทึกย้อนหลังล่าสุด</span>
            <button onClick={loadLogs} className="text-xs text-[#0071e3] font-bold hover:underline">
              🔄 ดึงข้อมูลใหม่
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">กำลังโหลดประวัติ Audit Log…</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">ยังไม่มีประวัติการบันทึก Audit Log ในเมนูนี้</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {logs.map((log) => {
                const actionBadgeClass =
                  log.action === "CREATE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : log.action === "UPDATE"
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : log.action === "DELETE"
                    ? "bg-rose-50 text-rose-700 border-rose-300"
                    : log.action === "VIEW"
                    ? "bg-sky-50 text-sky-700 border-sky-300"
                    : "bg-amber-50 text-amber-700 border-amber-300";

                const actionLabel =
                  log.action === "CREATE"
                    ? "สร้าง"
                    : log.action === "UPDATE"
                    ? "แก้ไข"
                    : log.action === "DELETE"
                    ? "ลบ"
                    : log.action === "VIEW"
                    ? "เปิดดู"
                    : "นำเข้าข้อมูล";

                return (
                  <div key={log.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${actionBadgeClass}`}>
                          {actionLabel}
                        </span>
                        <span className="font-extrabold text-slate-900">{log.entityName || "รายการในระบบ"}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {new Date(log.createdAt).toLocaleString("th-TH")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium pt-1">
                      {log.details}
                    </p>

                    <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between font-mono border-t border-slate-100">
                      <span>ผู้ดำเนินการ: <strong className="text-slate-700">{log.performerName}</strong></span>
                      <span>ID: {log.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
