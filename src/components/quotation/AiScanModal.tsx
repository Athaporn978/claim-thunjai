"use client";
import { useCallback, useRef, useState } from "react";
import { MAX_SCAN_CASES, scanAndSaveCase, type ScanCaseResult } from "@/lib/aiScan";

type SlotStatus = "idle" | "scanning" | "saving" | "done" | "error";

type Slot = {
  key: number;
  files: File[];
  status: SlotStatus;
  error?: string;
  result?: ScanCaseResult;
};

const ACCEPT = ".pdf,image/*";

let nextKey = 1;
const newSlot = (): Slot => ({ key: nextKey++, files: [], status: "idle" });

export function AiScanModal({
  lang, onClose, onFinished,
}: {
  lang: string;
  onClose: () => void;
  /** Called once the run finishes with at least one saved case. */
  onFinished: (saved: ScanCaseResult[]) => void;
}) {
  const th = lang === "th";
  const [slots, setSlots] = useState<Slot[]>([newSlot()]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const patch = useCallback((key: number, p: Partial<Slot>) => {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...p } : s)));
  }, []);

  const addFiles = (key: number, picked: FileList | File[] | null) => {
    const arr = Array.from(picked || []);
    if (arr.length === 0) return;
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, files: [...s.files, ...arr] } : s)));
  };

  const removeFile = (key: number, idx: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.key === key ? { ...s, files: s.files.filter((_, i) => i !== idx) } : s))
    );
  };

  const addSlot = () => setSlots((prev) => (prev.length >= MAX_SCAN_CASES ? prev : [...prev, newSlot()]));
  const removeSlot = (key: number) =>
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));

  const readySlots = slots.filter((s) => s.files.length > 0);
  const doneCount = slots.filter((s) => s.status === "done").length;
  const failCount = slots.filter((s) => s.status === "error").length;

  const start = async () => {
    if (readySlots.length === 0) return;
    setRunning(true);

    const saved: ScanCaseResult[] = [];
    // One case at a time: each gets its own fresh extraction context, and a
    // failure can't take the rest of the run down with it.
    for (const slot of readySlots) {
      try {
        patch(slot.key, { status: "scanning", error: undefined });
        const result = await scanAndSaveCase(slot.files);
        patch(slot.key, { status: "done", result });
        saved.push(result);
      } catch (err: any) {
        console.error(`AI scan failed for case slot ${slot.key}:`, err);
        patch(slot.key, { status: "error", error: err?.message || (th ? "ไม่สำเร็จ" : "Failed") });
      }
    }

    setRunning(false);
    setFinished(true);
    if (saved.length > 0) onFinished(saved);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-2xl my-4 bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>✨</span>
              {th ? "สร้างเคลมใหม่ด้วย AI" : "New claim with AI"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {th
                ? `อัปโหลดได้สูงสุด ${MAX_SCAN_CASES} เคส — 1 เคสใส่ได้หลายไฟล์ (ใบเสนอราคาหลายหน้า)`
                : `Up to ${MAX_SCAN_CASES} cases — one case can hold several files (multi-page quote)`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            aria-label={th ? "ปิด" : "Close"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Progress bar while running / after finishing */}
        {(running || finished) && (
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-[#0071e3] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                {th ? `สำเร็จแล้ว ${doneCount}/${readySlots.length}` : `${doneCount}/${readySlots.length} done`}
              </span>
              {failCount > 0 && (
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                  {th ? `ไม่สำเร็จ ${failCount}` : `${failCount} failed`}
                </span>
              )}
            </div>
            <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0071e3] transition-all duration-500 rounded-full"
                style={{ width: `${readySlots.length ? ((doneCount + failCount) / readySlots.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Case slots */}
        <div className="px-5 py-4 space-y-3 max-h-[52vh] overflow-y-auto">
          {slots.map((slot, i) => {
            const busy = slot.status === "scanning" || slot.status === "saving";
            return (
              <div
                key={slot.key}
                className={`rounded-xl border-2 transition ${
                  slot.status === "done"
                    ? "border-emerald-300 bg-emerald-50/50"
                    : slot.status === "error"
                    ? "border-red-300 bg-red-50/50"
                    : dragOver === slot.key
                    ? "border-[#0071e3] bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-extrabold text-slate-700">
                    {th ? `เคสที่ ${i + 1}` : `Case ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {busy && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#0071e3]">
                        <span className="w-3 h-3 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                        {slot.status === "scanning"
                          ? (th ? "AI กำลังอ่าน..." : "Scanning...")
                          : (th ? "กำลังบันทึก..." : "Saving...")}
                      </span>
                    )}
                    {slot.status === "done" && slot.result && (
                      <span className="text-[11px] font-bold text-emerald-700">
                        ✅ {slot.result.quotationNo}
                        {slot.result.customerName ? ` · ${slot.result.customerName}` : ""}
                        {` · ${th ? `${slot.result.itemCount} รายการ` : `${slot.result.itemCount} items`}`}
                      </span>
                    )}
                    {slot.status === "error" && (
                      <span className="text-[11px] font-bold text-red-700">❌ {slot.error}</span>
                    )}
                    {!running && !finished && slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.key)}
                        aria-label={th ? `ลบเคสที่ ${i + 1}` : `Remove case ${i + 1}`}
                        className="text-slate-400 hover:text-red-600 transition cursor-pointer text-sm font-bold px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Drop zone */}
                {!running && !finished && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(slot.key); }}
                    onDragLeave={() => setDragOver((d) => (d === slot.key ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      addFiles(slot.key, e.dataTransfer.files);
                    }}
                    onClick={() => inputRefs.current[slot.key]?.click()}
                    className="px-3 py-4 text-center cursor-pointer hover:bg-slate-50/80 transition"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      📎 {th ? "ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์" : "Drag files here, or click to browse"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {th ? "PDF หรือรูปภาพ — ใส่ได้หลายไฟล์ต่อ 1 เคส" : "PDF or images — several files per case"}
                    </p>
                    <input
                      ref={(el) => { inputRefs.current[slot.key] = el; }}
                      type="file"
                      accept={ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => { addFiles(slot.key, e.target.files); e.target.value = ""; }}
                    />
                  </div>
                )}

                {/* Selected files */}
                {slot.files.length > 0 && (
                  <ul className="px-3 pb-3 space-y-1">
                    {slot.files.map((f, idx) => (
                      <li
                        key={`${f.name}-${idx}`}
                        className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="text-slate-400 shrink-0">{f.type.includes("pdf") ? "📄" : "🖼️"}</span>
                        <span className="truncate text-slate-700 font-medium" title={f.name}>{f.name}</span>
                        <span className="ml-auto text-[11px] text-slate-400 shrink-0 tabular-nums">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        {!running && !finished && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(slot.key, idx); }}
                            aria-label={th ? "เอาไฟล์ออก" : "Remove file"}
                            className="text-slate-400 hover:text-red-600 transition cursor-pointer font-bold shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {!running && !finished && slots.length < MAX_SCAN_CASES && (
            <button
              type="button"
              onClick={addSlot}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-[#0071e3] hover:bg-blue-50 text-xs font-bold transition cursor-pointer"
            >
              + {th ? `เพิ่มเคส (สูงสุด ${MAX_SCAN_CASES})` : `Add case (max ${MAX_SCAN_CASES})`}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            {finished
              ? (th
                  ? `บันทึกร่างแล้ว ${doneCount} เคส${failCount > 0 ? ` · ไม่สำเร็จ ${failCount} เคส` : ""}`
                  : `${doneCount} draft(s) saved${failCount > 0 ? ` · ${failCount} failed` : ""}`)
              : readySlots.length > 0
              ? (th ? `เลือกไฟล์แล้ว ${readySlots.length} เคส` : `${readySlots.length} case(s) ready`)
              : (th ? "ยังไม่ได้เลือกไฟล์" : "No files selected")}
          </span>
          <div className="flex items-center gap-2">
            {!finished ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={running}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {th ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={start}
                  disabled={running || readySlots.length === 0}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition shadow-md ${
                    running || readySlots.length === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-[#0071e3] hover:bg-blue-600 text-white cursor-pointer"
                  }`}
                >
                  {running
                    ? (th ? "กำลังสแกน..." : "Scanning...")
                    : th
                    ? `เริ่มสแกน ${readySlots.length || ""} เคส`.trim()
                    : `Scan ${readySlots.length || ""} case(s)`.trim()}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white text-sm font-bold transition shadow-md cursor-pointer"
              >
                {th ? "ดูรายการเคส →" : "View cases →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
