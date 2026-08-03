"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

type Intake = {
  id: string; intakeNo: string; fromEmail: string | null; subject: string | null;
  status: string; customer: string | null; licensePlate: string | null;
  vehicleMake: string | null; claimNumber: string | null; createdAt: string;
  analysis: string | null; missing: string | null;
};

const STATUS: Record<string, { th: string; en: string; cls: string }> = {
  received: { th: "รับเข้า", en: "Received", cls: "bg-slate-100 text-slate-600" },
  processing: { th: "กำลังประมวลผล", en: "Processing", cls: "bg-blue-50 text-blue-700" },
  needs_info: { th: "รอข้อมูลเพิ่ม", en: "Needs info", cls: "bg-amber-50 text-amber-700" },
  completed: { th: "เสร็จสิ้น", en: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  failed: { th: "ล้มเหลว", en: "Failed", cls: "bg-red-50 text-red-700" },
  junk: { th: "ไม่เกี่ยว", en: "Junk", cls: "bg-slate-100 text-slate-500" },
};

// Countdown to auto-purge (24h TTL — matches server-side JUNK_TTL_HOURS)
function timeLeft(createdAt: string, lang: "th" | "en"): string {
  const ms = 24 * 60 * 60 * 1000 - (Date.now() - new Date(createdAt).getTime());
  if (ms <= 0) return lang === "th" ? "กำลังลบ…" : "purging…";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return lang === "th" ? `เหลือ ${h} ชม. ${m} นาที` : `${h}h ${m}m left`;
}

const SAMPLE_EMAIL = `เรียน ฝ่ายสินไหม
ทางศูนย์บริการ ABC ออโต้ ขอส่งเคลมรถลูกค้า คุณสมชาย ใจดี
ทะเบียน กข-1234 รถ Toyota Camry ปี 2022
เลขเคลม CLM-2026-8842  กรมธรรม์ POL-99012
แนบรูปความเสียหายรอบคันมาด้วยครับ
ติดต่อ 081-234-5678`;

export default function IntakePage() {
  const { lang } = useLang();
  const [rows, setRows] = useState<Intake[]>([]);
  const [junkCount, setJunkCount] = useState(0);
  const [view, setView] = useState<"active" | "junk">("active");
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");
  const [form, setForm] = useState({ fromEmail: "ABC ออโต้ <service@abc-auto.co.th>", subject: "เคลมรถ Toyota Camry กข-1234", body: SAMPLE_EMAIL });
  const [imgs, setImgs] = useState<{ data: string; mediaType: string; preview: string; name?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = (v: "active" | "junk" = view) => {
    setLoading(true);
    fetch(`/api/intake?view=${v}`).then((r) => r.json()).then((d) => {
      setRows(d.intakes || []);
      setJunkCount(d.junkCount || 0);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(view); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view]);

  const addImgs = async (files: FileList | null) => {
    if (!files) return;
    const next = await Promise.all(
      Array.from(files)
        .filter((f) => f.type.startsWith("image/") || f.type === "application/pdf" || f.name.endsWith(".pdf"))
        .map((f) => new Promise<{ data: string; mediaType: string; preview: string; name: string }>((res) => {
          const rd = new FileReader();
          rd.onload = () => {
            const r = rd.result as string;
            const mediaType = f.type || (f.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
            res({ data: r.split(",")[1], mediaType, preview: mediaType === "application/pdf" ? "" : r, name: f.name });
          };
          rd.readAsDataURL(f);
        }))
    );
    setImgs((p) => [...p, ...next]);
  };

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEmail: form.fromEmail, subject: form.subject, emailBody: form.body, images: imgs.map((i) => ({ data: i.data, mediaType: i.mediaType })) }),
      });
      const d = await res.json();
      if (d.skipped) {
        const missingStr = d.missing && Array.isArray(d.missing) ? d.missing.join(", ") : d.reason;
        setLastResult(lang === "th" ? `ไม่สร้างเคสเนื่องจากขาดข้อมูลบังคับ: (${missingStr})` : `Skipped intake: missing mandatory fields (${missingStr})`);
      } else if (d.intake?.status === "completed") {
        setLastResult(lang === "th" ? `เพิ่มเคสใหม่สำเร็จ! เลขที่ ${d.intake.intakeNo}` : `Case ${d.intake.intakeNo} created successfully!`);
      } else {
        setLastResult(lang === "th" ? `ประมวลผลสำเร็จ` : `Processing complete`);
      }
      setComposer(false); setImgs([]); load();
    } catch (err) {
      setLastResult(`Error: ${err instanceof Error ? err.message : "Failed to process"}`);
    } finally { setSending(false); }
  };

  const totalSaved = rows.length;
  const needsInfo = rows.filter((r) => r.status === "needs_info").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-navy-50 text-[var(--navy-900)] text-xs font-semibold mb-2">
            {lang === "th" ? "รับเคลมอัตโนมัติจากอีเมล · กึ่งอัตโนมัติ" : "Automated Email Intake · Human-in-the-loop"}
          </span>
          <h1 className="text-3xl font-bold text-[var(--navy-900)]">{lang === "th" ? "กล่องงานเข้า (Intake)" : "Intake Queue"}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {lang === "th" ? "ศูนย์บริการส่งอีเมล → AI ดึงข้อมูล + วิเคราะห์ภาพ + เทียบราคากลาง → พนักงานตรวจ/เติมข้อมูล" : "Center emails → AI extracts + analyzes + prices → staff reviews/completes"}
          </p>
        </div>
        <button onClick={() => setComposer(true)} className="btn-primary text-sm !py-2">✉️ {lang === "th" ? "จำลองเมลเข้า" : "Simulate email"}</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card !p-4"><div className="text-xs text-slate-500 font-semibold">{lang === "th" ? "งานที่ใช้งาน" : "Active"}</div><div className="text-3xl font-bold text-[var(--navy-900)]">{view === "active" ? totalSaved : "—"}</div></div>
        <div className="card !p-4"><div className="text-xs text-slate-500 font-semibold">{lang === "th" ? "รอข้อมูลเพิ่ม" : "Needs info"}</div><div className="text-3xl font-bold text-amber-600">{needsInfo}</div></div>
        <div className="card !p-4"><div className="text-xs text-slate-500 font-semibold">{lang === "th" ? "เสร็จสิ้น" : "Completed"}</div><div className="text-3xl font-bold text-emerald-700">{rows.filter((r) => r.status === "completed").length}</div></div>
      </div>

      {lastResult && (
        <div className={`mb-4 border rounded-xl px-4 py-3 text-sm flex items-center justify-between shadow-sm ${
          lastResult.includes("สำเร็จ") || lastResult.includes("created")
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
            : "bg-amber-50 border-amber-200 text-amber-900 font-medium"
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{lastResult.includes("สำเร็จ") || lastResult.includes("created") ? "✅" : "⚠️"}</span>
            <span>{lastResult}</span>
          </div>
          <button onClick={() => setLastResult("")} className="text-slate-400 hover:text-slate-600 font-bold px-2">✕</button>
        </div>
      )}

      {/* Tabs: active vs junk */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {[
          { k: "active", th: "งานทั้งหมด", en: "All cases" },
          { k: "junk", th: `ไม่เกี่ยว${junkCount ? ` (${junkCount})` : ""}`, en: `Junk${junkCount ? ` (${junkCount})` : ""}` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k as "active" | "junk")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${view === t.k ? "border-[var(--orange-500)] text-[var(--navy-900)]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {lang === "th" ? t.th : t.en}
          </button>
        ))}
      </div>

      {view === "junk" && (
        <div className="mb-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          🗑️ {lang === "th"
            ? "เมลที่ AI ประเมินแล้วว่าไม่ใช่เคลม (ข้อมูลไม่ครบ) จะถูกลบอัตโนมัติหลัง 24 ชม. — ถ้าเจอที่ตัดผิด ให้แจ้งเพิ่ม pattern ที่ mailFilter"
            : "AI-classified non-claim emails (incomplete data) auto-purge after 24h. Update mailFilter for false-positives."}
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="text-left px-5 py-3">{lang === "th" ? "เลขที่" : "No."}</th>
                <th className="text-left px-5 py-3">{lang === "th" ? "ผู้ส่ง / หัวข้อ" : "From / Subject"}</th>
                <th className="text-left px-5 py-3">{lang === "th" ? "ลูกค้า / รถ" : "Customer / Vehicle"}</th>
                <th className="text-left px-5 py-3">{lang === "th" ? "เคลม" : "Claim"}</th>
                <th className="text-center px-5 py-3">{lang === "th" ? "สถานะ" : "Status"}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">{lang === "th" ? "ยังไม่มีงานเข้า — ลองกด “จำลองเมลเข้า”" : "No intakes yet — try “Simulate email”"}</td></tr>
              ) : rows.map((r) => {
                const st = STATUS[r.status] || STATUS.received;
                let dmg = 0; try { dmg = JSON.parse(r.analysis || "{}").damageCount || 0; } catch {}
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[var(--navy-900)]">{r.intakeNo}</td>
                    <td className="px-5 py-3"><div className="font-medium truncate max-w-[220px]">{r.fromEmail || "—"}</div><div className="text-xs text-slate-500 truncate max-w-[220px]">{r.subject}</div></td>
                    <td className="px-5 py-3"><div>{r.customer || <span className="text-amber-600">— {lang === "th" ? "ขาด" : "missing"}</span>}</div><div className="text-xs text-slate-500">{r.licensePlate} · {r.vehicleMake} · {dmg > 0 ? `${dmg} ${lang === "th" ? "จุด" : "dmg"}` : ""}</div></td>
                    <td className="px-5 py-3 text-xs">{r.claimNumber || "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`${st.cls} px-2 py-0.5 rounded text-xs font-semibold`}>{lang === "th" ? st.th : st.en}</span>
                        {r.status === "junk" && <span className="text-[10px] text-slate-400">{timeLeft(r.createdAt, lang)}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right"><Link href={`/intake/${r.id}`} className="text-[var(--navy-900)] hover:underline text-xs font-semibold">{lang === "th" ? "ตรวจสอบ →" : "Review →"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Composer modal */}
      {composer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setComposer(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-[var(--navy-900)]">✉️ {lang === "th" ? "จำลองอีเมลจากศูนย์บริการ" : "Simulate center email"}</h3>
              <button onClick={() => setComposer(false)} className="w-8 h-8 rounded-full hover:bg-slate-100">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-slate-500">{lang === "th" ? "จาก" : "From"}</label><input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-slate-500">{lang === "th" ? "หัวข้อ" : "Subject"}</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-slate-500">{lang === "th" ? "เนื้ออีเมล (free-form)" : "Email body (free-form)"}</label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div>
                <label className="text-xs font-semibold text-slate-500">{lang === "th" ? "แนบรูปความเสียหาย / ไฟล์ PDF ใบเสนอราคา" : "Attach damage photos / PDF quotation"}</label>
                <input ref={fileRef} type="file" accept="image/*,.pdf,application/pdf" multiple hidden onChange={(e) => addImgs(e.target.files)} />
                <button onClick={() => fileRef.current?.click()} className="mt-1 w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-[var(--orange-500)] flex items-center justify-center gap-1.5">
                  <span>📎</span>
                  <span>+ {lang === "th" ? "เลือกรูป / ไฟล์ PDF" : "Add photos / PDF"}</span>
                  {imgs.length > 0 && <span className="font-bold text-[var(--orange-600)]">({imgs.length})</span>}
                </button>
                {imgs.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imgs.map((im, i) => (
                      im.mediaType === "application/pdf" ? (
                        <div key={i} className="flex flex-col items-center justify-center p-2 bg-red-50 border border-red-200 rounded-lg text-center aspect-square">
                          <span className="text-2xl">📄</span>
                          <span className="text-[10px] text-red-700 font-semibold truncate w-full mt-1">{im.name || "document.pdf"}</span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={im.preview} alt="" className="aspect-square object-cover rounded-lg w-full h-full border border-slate-200" />
                      )
                    ))}
                  </div>
                )}
              </div>
              <button onClick={send} disabled={sending} className="btn-primary w-full justify-center disabled:opacity-50">
                {sending ? (lang === "th" ? "AI กำลังประมวลผล…" : "AI processing…") : (lang === "th" ? "ส่งเข้าระบบ" : "Send to system")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
