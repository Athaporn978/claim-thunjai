"use client";
import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { DamageReportView, type AnalyzeResult } from "@/components/DamageReportView";
import { signature, isDuplicate, type ImgSig } from "@/lib/imageHash";
import { validateVin } from "@/lib/vinValidation";
import { BRANDS } from "@/lib/carCatalog";

type UploadedImage = { file: File; preview: string; base64: string; mediaType: string; sig: ImgSig };

const MAX_IMAGES = 30; // must match MAX_IMAGES_PER_REQUEST in /api/analyze/route.ts

// Top brands pinned at the top of the dropdown (Thai market priority)
const TOP_BRAND_NAMES = [
  "Toyota", "Honda", "Isuzu", "Nissan", "Mitsubishi",
  "Mazda", "Ford", "BYD", "MG", "BMW", "Mercedes-Benz", "Suzuki",
];
const ALL_BRAND_NAMES = BRANDS.map((b) => b.name);

function BrandCombobox({ value, onChange, lang }: {
  value: string; onChange: (v: string) => void; lang: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const q = query.toLowerCase().trim();
  const topMatches = TOP_BRAND_NAMES.filter((b) => !q || b.toLowerCase().includes(q));
  const otherMatches = ALL_BRAND_NAMES.filter((b) => !TOP_BRAND_NAMES.includes(b) && (!q || b.toLowerCase().includes(q)));
  const showDropdown = open && (topMatches.length > 0 || otherMatches.length > 0);

  const select = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Toyota"
        className={`px-3 py-2 border rounded-md text-xs w-full focus:ring-2 focus:ring-[#0071e3] ${
          !value.trim() ? "border-slate-200" : "border-blue-300"
        }`}
      />
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {topMatches.map((name) => (
            <button key={name} onMouseDown={() => select(name)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0071e3]">
              {name}
            </button>
          ))}
          {topMatches.length > 0 && otherMatches.length > 0 && (
            <div className="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-100 bg-slate-50 font-medium">
              {lang === "th" ? "— ยี่ห้ออื่น —" : "— Other brands —"}
            </div>
          )}
          {otherMatches.map((name) => (
            <button key={name} onMouseDown={() => select(name)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50">
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelCombobox({ value, onChange, make, lang }: {
  value: string; onChange: (v: string, bodyStyle?: string) => void; make: string; lang: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const brand = BRANDS.find((b) => b.name.toLowerCase() === make.toLowerCase());
  const models = brand?.models ?? [];
  const q = query.toLowerCase().trim();
  const filtered = models.filter((m) => !q || m.name.toLowerCase().includes(q));

  const select = (name: string, bodyStyle?: string) => {
    onChange(name, bodyStyle);
    setQuery(name);
    setOpen(false);
  };

  // Brand not in catalog — fall back to free-text
  if (!brand) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={lang === "th" ? "รุ่นรถ" : "Model"}
        className={`px-3 py-2 border rounded-md text-xs w-full focus:ring-2 focus:ring-[#0071e3] ${
          !value.trim() ? "border-slate-200" : "border-blue-300"
        }`}
      />
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={lang === "th" ? "ค้นหารุ่น..." : "Search model..."}
        className={`px-3 py-2 border rounded-md text-xs w-full focus:ring-2 focus:ring-[#0071e3] ${
          !value.trim() ? "border-slate-200" : "border-blue-300"
        }`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((m) => (
            <button key={m.id} onMouseDown={() => select(m.name, m.bodyStyle)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0071e3]">
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VinField({ value, onChange, make, year, lang }: {
  value: string; onChange: (v: string) => void;
  make?: string; year?: string | number; lang: string;
}) {
  const vin = (value || "").toUpperCase();
  const result = validateVin(vin, { make, year });
  const hasError = !!result.formatError;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">
        {lang === "th" ? "หมายเลขตัวถัง (VIN)" : "VIN / Chassis No."}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="17-character VIN"
        maxLength={17}
        className={`mt-1 w-full px-3 py-2 border rounded-md font-mono text-xs focus:ring-2 focus:ring-[#0071e3] ${
          hasError ? "border-red-400 bg-red-50" : "border-slate-200"
        }`}
      />
      {hasError && (
        <p className="mt-1 text-[11px] text-red-600 font-medium">⛔ {result.formatError}</p>
      )}
      {!hasError && hasWarnings && (
        <div className="mt-1.5 space-y-0.5">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-700 font-medium">⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

const BODY_TYPES = [
  { value: "sedan", th: "เก๋ง / Sedan" },
  { value: "suv",   th: "SUV" },
  { value: "pickup", th: "กระบะ / Pickup" },
  { value: "van",   th: "รถตู้ / Van" },
];

export default function AnalyzePage() {
  const { t, lang } = useLang();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [meta, setMeta] = useState({
    claimNumber: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    policyHolder: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleBodyType: "",
    licensePlate: "",
    vinNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ results: AnalyzeResult[]; overallSeverity: string; claimId?: string } | null>(null);
  const [dupNote, setDupNote] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
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
    if (!meta.vehicleMake.trim()) {
      setValidationError(lang === "th" ? "กรุณากรอกยี่ห้อรถ (*)" : "Vehicle Make is required (*)");
      return;
    }
    if (!meta.vehicleModel.trim()) {
      setValidationError(lang === "th" ? "กรุณากรอกรุ่นรถ (*)" : "Vehicle Model is required (*)");
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
        if (prev >= 94) { clearInterval(timer); return 94; }
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
          vehicleMake: meta.vehicleMake || undefined,
          vehicleModel: meta.vehicleModel || undefined,
          vehicleYear: meta.vehicleYear || undefined,
          vehicleBodyType: meta.vehicleBodyType || undefined,
          licensePlate: meta.licensePlate || undefined,
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

  // Aggregate conflict data across all result images
  const conflicts = result?.results?.flatMap((r) => r.vehicleConflict ? [r.vehicleConflict] : []) ?? [];
  const makeMismatch = conflicts.some((c) => c.makeMatch === false);
  const plateMismatch = conflicts.some((c) => c.plateMatch === false);
  const detectedMakeExample = conflicts.find((c) => c.makeMatch === false && c.detectedMake)?.detectedMake;
  const detectedPlateExample = conflicts.find((c) => c.plateMatch === false && c.detectedPlate)?.detectedPlate;

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

              {/* Claim Number */}
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

              {/* Policy Holder */}
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

              {/* Make (required) */}
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {lang === "th" ? "ยี่ห้อรถ" : "Make"} <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="mt-1">
                  <BrandCombobox
                    value={meta.vehicleMake}
                    lang={lang}
                    onChange={(v) => setMeta((m) => ({ ...m, vehicleMake: v, vehicleModel: v !== m.vehicleMake ? "" : m.vehicleModel }))}
                  />
                </div>
              </div>

              {/* Model (required) */}
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {lang === "th" ? "รุ่นรถ" : "Model"} <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="mt-1">
                  <ModelCombobox
                    value={meta.vehicleModel}
                    make={meta.vehicleMake}
                    lang={lang}
                    onChange={(v, bodyStyle) => setMeta((m) => ({
                      ...m,
                      vehicleModel: v,
                      vehicleBodyType: bodyStyle ?? m.vehicleBodyType,
                    }))}
                  />
                </div>
              </div>

              {/* Year + Body Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "th" ? "ปีรถ" : "Year"}
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2099"
                    value={meta.vehicleYear}
                    onChange={(e) => setMeta({ ...meta, vehicleYear: e.target.value })}
                    placeholder={String(new Date().getFullYear())}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "th" ? "ประเภทตัวถัง" : "Body Type"}
                  </label>
                  <select
                    value={meta.vehicleBodyType}
                    onChange={(e) => setMeta({ ...meta, vehicleBodyType: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="">{lang === "th" ? "— เลือก —" : "— Select —"}</option>
                    {BODY_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.th}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* License Plate */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  {lang === "th" ? "ทะเบียนรถ" : "License Plate"}
                </label>
                <input
                  value={meta.licensePlate}
                  onChange={(e) => setMeta({ ...meta, licensePlate: e.target.value })}
                  placeholder={lang === "th" ? "กข-1234" : "ABC-123"}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              {/* VIN */}
              <VinField
                value={meta.vinNumber}
                onChange={(v) => setMeta({ ...meta, vinNumber: v })}
                make={meta.vehicleMake}
                year={meta.vehicleYear}
                lang={lang}
              />

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
        <div className="mt-10 space-y-4">

          {/* Vehicle conflict warning banner */}
          {(makeMismatch || plateMismatch) && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex gap-3">
              <span className="text-amber-500 text-xl leading-none mt-0.5">⚠️</span>
              <div className="space-y-1.5 text-sm">
                <p className="font-bold text-amber-900">
                  {lang === "th" ? "พบความขัดแย้งระหว่างข้อมูลที่กรอกกับภาพ — กรุณาตรวจสอบก่อนส่งรายงาน" : "Data conflict detected — please verify before submitting"}
                </p>
                {makeMismatch && (
                  <p className="text-amber-800 text-xs">
                    {lang === "th"
                      ? `ยี่ห้อรถ: กรอก "${meta.vehicleMake}" แต่ AI ตรวจพบ "${detectedMakeExample}" ในภาพ`
                      : `Make: entered "${meta.vehicleMake}" but AI detected "${detectedMakeExample}" in image`}
                  </p>
                )}
                {plateMismatch && (
                  <p className="text-amber-800 text-xs">
                    {lang === "th"
                      ? `ทะเบียน: กรอก "${meta.licensePlate}" แต่ AI อ่านได้ "${detectedPlateExample}" จากภาพ`
                      : `Plate: entered "${meta.licensePlate}" but AI read "${detectedPlateExample}" from image`}
                  </p>
                )}
                <p className="text-amber-600 text-xs">
                  {lang === "th"
                    ? "เป็นเพียงคำเตือน ไม่บล็อกการทำงาน — AI อาจอ่านโลโก้/ทะเบียนไม่ชัดในบางมุมภาพ"
                    : "Warning only — AI may misread logos or plates in certain angles."}
                </p>
              </div>
            </div>
          )}

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

      {/* Processing Progress Modal */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b132a]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 border border-sky-100 animate-in zoom-in-95 duration-200">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-sky-100 border-t-[#0071e3] animate-spin" />
              <div className="w-12 h-12 rounded-full bg-sky-50 text-2xl flex items-center justify-center shadow-inner">⚡</div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#1d1d1f]">
                {lang === "th" ? "กำลังประมวลผล..." : "Processing..."}
              </h3>
              <div className="text-3xl font-extrabold text-[#0071e3] font-mono tracking-tight">{progress}%</div>
            </div>
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
