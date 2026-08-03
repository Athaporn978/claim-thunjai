"use client";
import { useState, useRef } from "react";
import { useLang } from "@/lib/LangContext";
import { DamageReportView, type AnalyzeResult } from "@/components/DamageReportView";
import { signature, isDuplicate, type ImgSig } from "@/lib/imageHash";

type UploadedImage = { file: File; preview: string; base64: string; mediaType: string; sig: ImgSig };

const MAX_IMAGES = 60; // soft safety cap

export default function AnalyzePage() {
  const { t, lang } = useLang();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [meta, setMeta] = useState({
    claimNumber: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    policyHolder: "",
    vehicleMake: "",
    vehicleModel: "",
    licensePlate: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ results: AnalyzeResult[]; overallSeverity: string; claimId?: string } | null>(null);
  const [dupNote, setDupNote] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setDupNote("");
    const next: UploadedImage[] = [];
    let skipped = 0;
    const seen: ImgSig[] = images.map((i) => i.sig).filter((s) => s.hash);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (images.length + next.length >= MAX_IMAGES) break;
      const sig = await signature(file);
      if (isDuplicate(sig, seen)) { skipped++; continue; }
      if (sig.hash) seen.push(sig);
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      next.push({ file, preview: URL.createObjectURL(file), base64, mediaType: file.type, sig });
    }
    setImages((prev) => [...prev, ...next]);
    if (skipped > 0) {
      setDupNote(lang === "th" ? `ตัดรูปซ้ำออก ${skipped} รูป (ประหยัดค่าวิเคราะห์)` : `Skipped ${skipped} near-duplicate photo(s)`);
    }
  };

  const remove = (i: number) => setImages((p) => p.filter((_, idx) => idx !== i));

  const [validationError, setValidationError] = useState<string>("");

  const analyze = async () => {
    setValidationError("");
    if (!meta.claimNumber.trim()) {
      setValidationError(lang === "th" ? "กรุณากรอกเลขที่เคลม (*)" : "Claim Number is required (*)");
      return;
    }
    if (!meta.policyHolder.trim()) {
      setValidationError(lang === "th" ? "กรุณากรอกชื่อผู้เอาประกัน (*)" : "Policy Holder name is required (*)");
      return;
    }
    if (images.length === 0) {
      setValidationError(lang === "th" ? "กรุณาอัปโหลดภาพถ่ายความเสียหายอย่างน้อย 1 ภาพ (*)" : "Please upload at least 1 photo (*)");
      return;
    }

    setLoading(true);
    setProgress(10);
    setResult(null);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) {
          clearInterval(timer);
          return 94;
        }
        return Math.min(94, prev + Math.floor(Math.random() * 8) + 4);
      });
    }, 250);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((i) => ({ data: i.base64, mediaType: i.mediaType })),
          claimNumber: meta.claimNumber,
          insurerId: "demo",
          policyHolder: meta.policyHolder,
          vehicleMake: meta.vehicleMake || "Škoda",
          vehicleModel: meta.vehicleModel || "Superb",
          licensePlate: meta.licensePlate || "กข-1234",
        }),
      });
      const data = await res.json();
      setProgress(100);
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 300);
    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : "Unknown"));
      setLoading(false);
    } finally {
      clearInterval(timer);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--navy-900)]">{t.analyze.title}</h1>
        <p className="text-slate-600 mt-2">{t.analyze.sub}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-[var(--navy-900)] mb-3 flex items-center justify-between">
              <span>{lang === "th" ? "ข้อมูลเคลม" : "Claim Info"}</span>
              <span className="text-xs text-red-500 font-normal">{lang === "th" ? "* จำเป็นต้องกรอก" : "* Required"}</span>
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {t.analyze.claimNum} <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  value={meta.claimNumber}
                  onChange={(e) => setMeta({ ...meta, claimNumber: e.target.value })}
                  placeholder="CLM-2026-XXXX"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-xs focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {t.analyze.policyHolder} <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  value={meta.policyHolder}
                  onChange={(e) => setMeta({ ...meta, policyHolder: e.target.value })}
                  placeholder={lang === "th" ? "สมชาย ใจดี" : "John Doe"}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">{t.analyze.vehicle}</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    value={meta.vehicleMake}
                    onChange={(e) => setMeta({ ...meta, vehicleMake: e.target.value })}
                    placeholder="Toyota"
                    className="px-3 py-2 border border-slate-200 rounded-md text-xs"
                  />
                  <input
                    value={meta.vehicleModel}
                    onChange={(e) => setMeta({ ...meta, vehicleModel: e.target.value })}
                    placeholder="Camry"
                    className="px-3 py-2 border border-slate-200 rounded-md text-xs"
                  />
                </div>
                <input
                  value={meta.licensePlate}
                  onChange={(e) => setMeta({ ...meta, licensePlate: e.target.value })}
                  placeholder={lang === "th" ? "ทะเบียนรถ (เช่น กข-1234)" : "License Plate (e.g. ABC-123)"}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-md text-xs"
                />
              </div>
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              ⚠️ {validationError}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={loading}
            className="btn-primary w-full justify-center text-sm py-3.5 shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M22 12a10 10 0 0 1-10 10"/></svg>
                {t.analyze.analyzing}
              </>
            ) : (
              <>🤖 {t.analyze.analyze}</>
            )}
          </button>
        </div>

        {/* Right: upload + previews */}
        <div className="lg:col-span-2 space-y-4">
          <div
            className="card !p-0 border-2 border-dashed border-slate-300 hover:border-[var(--orange-500)] hover:bg-orange-50/30 transition cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">📸</div>
              <div className="font-semibold text-[var(--navy-900)]">{t.analyze.uploadHint}</div>
              <div className="text-xs text-slate-500 mt-1">
                JPEG · PNG · WebP · {lang === "th" ? "ไม่จำกัดจำนวน (ระบบตัดรูปซ้ำอัตโนมัติ)" : "unlimited — auto-dedupes"}
              </div>
            </div>
          </div>
          {(dupNote || images.length > 0) && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-emerald-600">{dupNote}</span>
              {images.length > 0 && <span className="text-slate-500">{images.length} {lang === "th" ? "รูป" : "photos"}</span>}
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="w-full h-full object-cover"/>
                  <button onClick={() => remove(i)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-10">
          <DamageReportView
            results={result.results}
            previews={images.map((i) => i.preview)}
            overallSeverity={result.overallSeverity}
            meta={{
              claimNumber: meta.claimNumber,
              policyHolder: meta.policyHolder,
              vehicleMake: meta.vehicleMake,
              vehicleModel: meta.vehicleModel,
              licensePlate: meta.licensePlate,
            }}
          />
        </div>
      )}

      {/* Processing Progress Modal Popup with Percentage Bar */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b132a]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 border border-sky-100 animate-in zoom-in-95 duration-200">
            {/* Animated AI Spinner with Center Badge */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-sky-100 border-t-[#0071e3] animate-spin" />
              <div className="w-12 h-12 rounded-full bg-sky-50 text-2xl flex items-center justify-center shadow-inner">
                ⚡
              </div>
            </div>

            {/* Main Title & Percentage */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#1d1d1f]">
                {lang === "th" ? "กำลังประมวลผล..." : "Processing..."}
              </h3>
              <div className="text-3xl font-extrabold text-[#0071e3] font-mono tracking-tight">
                {progress}%
              </div>
            </div>

            {/* Smooth Dynamic Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-sky-100 rounded-full overflow-hidden p-0.5 border border-sky-200">
                <div
                  className="h-full bg-gradient-to-r from-[#0071e3] via-sky-400 to-[#0077ed] rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">
                {progress < 30
                  ? (lang === "th" ? "กำลังสกัดแยกแยะรูปภาพ..." : "Parsing images...")
                  : progress < 75
                  ? (lang === "th" ? "กำลังสแกนตำแหน่งชิ้นส่วนความเสียหาย..." : "Scanning panel damages...")
                  : progress < 99
                  ? (lang === "th" ? "กำลังประเมินระดับความเสียหายและราคากลาง..." : "Calibrating severity & catalog prices...")
                  : (lang === "th" ? "ประมวลผลเสร็จสิ้น 100%" : "Processing complete 100%")}
              </p>
            </div>

            {/* Warning Box - DO NOT CLOSE OR LEAVE */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-left">
              <span className="text-amber-600 text-lg leading-none mt-0.5">⚠️</span>
              <div className="text-xs font-semibold text-amber-800 leading-snug">
                <span className="font-bold block text-amber-900 mb-0.5">
                  {lang === "th" ? "ข้อควรระวังสำคัญ:" : "Important Warning:"}
                </span>
                {lang === "th"
                  ? "กรุณาห้ามปิด หรือออกจากหน้านี้ ขณะระบบกำลังประมวลผล"
                  : "Please DO NOT close or leave this page while processing."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
