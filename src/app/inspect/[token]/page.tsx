"use client";
import { use, useEffect, useRef, useState } from "react";

type Shot = { preview: string; base64: string; mediaType: string };

const ANGLES = [
  { id: "front", th: "ด้านหน้า", ref: "/cars/sedan/front.png" },
  { id: "front-left", th: "แนวทแยงหน้าซ้าย", ref: "/cars/sedan/front-left.png" },
  { id: "left", th: "ด้านซ้าย", ref: "/cars/sedan/left.png" },
  { id: "rear-left", th: "แนวทแยงหลังซ้าย", ref: "/cars/sedan/rear-left.png" },
  { id: "rear", th: "ด้านหลัง", ref: "/cars/sedan/rear.png" },
  { id: "rear-right", th: "แนวทแยงหลังขวา", ref: "/cars/sedan/rear-right.png" },
  { id: "right", th: "ด้านขวา", ref: "/cars/sedan/right.png" },
  { id: "front-right", th: "แนวทแยงหน้าขวา", ref: "/cars/sedan/front-right.png" },
] as const;

const DOCS = [
  { id: "odometer", th: "เลขไมล์", icon: "🔢" },
  { id: "vin", th: "เลขตัวถัง (VIN)", icon: "🆔" },
  { id: "registration", th: "สมุดจดทะเบียน", icon: "📗" },
] as const;

function readFile(file: File): Promise<Shot> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => { const r = reader.result as string; resolve({ preview: r, base64: r.split(",")[1], mediaType: file.type }); };
    reader.readAsDataURL(file);
  });
}

export default function CustomerInspectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [caseInfo, setCaseInfo] = useState<{ caseNo: string; customer: string; licensePlate: string | null; status: string; submittedAt: string | null } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [shots, setShots] = useState<Record<string, Shot>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ status: string } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/inspect/${token}`).then((r) => r.json()).then((d) => {
      if (d.error) setLoadErr(d.error);
      else setCaseInfo(d.case);
    });
  }, [token]);

  const setShot = async (id: string, file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const shot = await readFile(file);
    setShots((s) => ({ ...s, [id]: shot }));
  };
  const removeShot = (id: string) => {
    setShots((s) => { const n = { ...s }; delete n[id]; return n; });
    const el = inputs.current[id]; if (el) el.value = "";
  };

  const totalSlots = ANGLES.length + DOCS.length;
  const doneCount = Object.keys(shots).length;
  const angleDone = ANGLES.filter((a) => shots[a.id]).length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const angles: Record<string, { data: string; mediaType: string }> = {};
      for (const a of ANGLES) { const s = shots[a.id]; if (s) angles[a.id] = { data: s.base64, mediaType: s.mediaType }; }
      const docs: Record<string, { data: string; mediaType: string }> = {};
      for (const d of DOCS) { const s = shots[d.id]; if (s) docs[d.id] = { data: s.base64, mediaType: s.mediaType }; }
      const res = await fetch(`/api/inspect/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angles, docs }),
      });
      const data = await res.json();
      if (data.ok) setDone({ status: data.status });
      else alert(data.error || "Error");
    } catch { alert("Error"); } finally { setSubmitting(false); }
  };

  if (loadErr) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
    <div><div className="text-4xl mb-2">❌</div><h1 className="font-bold text-lg text-[var(--navy-900)]">ไม่พบเคสตรวจสภาพนี้</h1><p className="text-sm text-slate-600 mt-1">ลิงก์อาจหมดอายุหรือถูกใช้แล้ว</p></div>
  </div>;
  if (!caseInfo) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">…</div>;

  if (caseInfo.status !== "pending" || done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-3">✅</div>
        <h1 className="text-2xl font-bold text-[var(--navy-900)]">ส่งข้อมูลสำเร็จ</h1>
        <p className="text-sm text-slate-600 mt-2">
          ระบบได้รับรูปตรวจสภาพของคุณ {caseInfo.customer} เรียบร้อยแล้ว
          <br />เจ้าหน้าที่ประกันจะติดต่อกลับหลังจากตรวจสอบเสร็จ
        </p>
        <div className="mt-4 inline-block font-mono text-xs text-slate-500">{caseInfo.caseNo}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-[var(--navy-900)] text-white px-4 py-3">
        <div className="text-xs text-white/60">ClaimThunJai · ตรวจสภาพต่อกรมธรรม์</div>
        <div className="font-bold text-sm">{caseInfo.customer}{caseInfo.licensePlate && ` · ${caseInfo.licensePlate}`}</div>
      </div>

      <div className="px-4 py-4">
        <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--navy-900)]">ความคืบหน้า · {doneCount}/{totalSlots}</span>
            <span className="font-bold text-[var(--orange-600)]">{Math.round((doneCount / totalSlots) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--orange-500)] transition-all" style={{ width: `${(doneCount / totalSlots) * 100}%` }} />
          </div>
          <div className="text-[10px] text-slate-500 mt-2">📸 ระบบจะเปิดกล้องให้ถ่ายใหม่ทันที (ไม่รองรับเลือกจากคลังภาพ)</div>
        </div>

        <h3 className="font-bold text-[var(--navy-900)] mb-2 text-sm">รูปรอบคัน 8 มุม · {angleDone}/8</h3>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {ANGLES.map((a, i) => {
            const shot = shots[a.id];
            return (
              <div key={a.id}>
                <input ref={(el) => { inputs.current[a.id] = el; }} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setShot(a.id, e.target.files?.[0])} />
                <div
                  onClick={() => inputs.current[a.id]?.click()}
                  className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition cursor-pointer ${shot ? "border-emerald-400" : "border-dashed border-slate-300"}`}
                >
                  {shot ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.preview} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center shadow">✓</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeShot(a.id); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm font-bold flex items-center justify-center shadow">✕</button>
                    </>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.ref} alt="" className="absolute inset-0 w-full h-full object-contain opacity-25" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <span className="w-7 h-7 rounded-full bg-white text-[var(--navy-900)] text-xs flex items-center justify-center mb-1 shadow font-bold">{i + 1}</span>
                        <span className="text-xl">📷</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-center mt-1 text-slate-600">{a.th}</div>
              </div>
            );
          })}
        </div>

        <h3 className="font-bold text-[var(--navy-900)] mb-2 text-sm">เอกสารรถ</h3>
        <div className="grid grid-cols-3 gap-2">
          {DOCS.map((d) => {
            const shot = shots[d.id];
            return (
              <div key={d.id}>
                <input ref={(el) => { inputs.current[d.id] = el; }} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setShot(d.id, e.target.files?.[0])} />
                <div
                  onClick={() => inputs.current[d.id]?.click()}
                  className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 transition cursor-pointer ${shot ? "border-emerald-400" : "border-dashed border-slate-300"}`}
                >
                  {shot ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.preview} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center shadow">✓</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeShot(d.id); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm font-bold flex items-center justify-center shadow">✕</button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <span className="text-2xl mb-1">{d.icon}</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-center mt-1 text-slate-600 leading-tight">{d.th}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <button onClick={submit} disabled={submitting || doneCount === 0} className="btn-primary w-full justify-center disabled:opacity-40">
          {submitting ? "🤖 AI กำลังตรวจสอบ…" : `ส่งข้อมูลตรวจสภาพ (${doneCount}/${totalSlots})`}
        </button>
      </div>
    </div>
  );
}
