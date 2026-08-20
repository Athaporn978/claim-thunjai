"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { CarDiagram, ANGLES, getAngleParts, matchedPartTh, type Angle, type CarBodyType } from "@/components/CarDiagram";
import { BRANDS, VEHICLE_TYPE_LABEL, SIZE_LABEL, type CarModel } from "@/lib/carCatalog";

type PricesMap = Record<string, { minor: number | null; moderate: number | null; severe: number | null; replace: number | null }>;

export default function CatalogPage() {
  const { lang } = useLang();

  // Labor Price Catalog State
  const [brandId, setBrandId] = useState(BRANDS[0].id);
  const [modelId, setModelId] = useState(BRANDS[0].models.find((m) => m.id === "camry")?.id || BRANDS[0].models[0].id);
  const [angleIdx, setAngleIdx] = useState(0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>("front-bumper");
  const [prices, setPrices] = useState<PricesMap>({});
  const [loadingLabor, setLoadingLabor] = useState(false);

  const brand = BRANDS.find((b) => b.id === brandId)!;
  const model: CarModel = brand.models.find((m) => m.id === modelId) || brand.models[0];

  const angle: Angle = ANGLES[angleIdx].id;
  const bodyType: CarBodyType = model.bodyStyle;

  const onBrand = (id: string) => {
    setBrandId(id);
    const b = BRANDS.find((x) => x.id === id)!;
    setModelId(b.models[0].id);
  };

  // Fetch Labor Prices — sourced from LaborPrice (real per-brand/per-model data),
  // matched via src/lib/laborPriceAlias.ts since carCatalog and the labor-code
  // Excel name brands/models differently.
  useEffect(() => {
    setLoadingLabor(true);
    fetch(`/api/prices?brandId=${brandId}&modelId=${modelId}`)
      .then((r) => r.json())
      .then((d) => setPrices(d.prices || {}))
      .finally(() => setLoadingLabor(false));
  }, [brandId, modelId]);

  useEffect(() => {
    const parts = getAngleParts(angle, bodyType);
    const first = parts.find((p) => matchedPartTh(p, prices)) || parts[0];
    if (first) setSelectedPartId(first.id);
  }, [angle, bodyType, prices]);

  const parts = getAngleParts(angle, bodyType);
  const vtLabel = VEHICLE_TYPE_LABEL[model.vehicleType][lang];
  const szLabel = SIZE_LABEL[model.size][lang];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>📖</span> {lang === "th" ? "คลังราคากลางอัตราค่าแรงซ่อม" : "Labor Repair Price Catalog"}
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            {lang === "th"
              ? "อัตราค่าแรงเคาะพ่นสีมาตรฐานสมาคมอู่กลางการประกันภัย (uklang.com) แยกตามหมวดประเภทรถและขนาดตัวถัง"
              : "Standard labor repair costs from สมาคมอู่กลางการประกันภัย (uklang.com) categorized by vehicle type & size"}
          </p>
        </div>

        {/* Link to Parts Catalog */}
        <Link
          href="/parts-catalog"
          className="px-5 py-2.5 rounded-2xl bg-[#0071e3] hover:bg-[#005bb5] text-white font-extrabold text-xs flex items-center gap-2 transition shadow-md shadow-blue-500/20 shrink-0"
        >
          <span>📦</span>
          <span>{lang === "th" ? "ไปยังเมนู ราคาค่าอะไหล่ →" : "Go to Parts Price Catalog →"}</span>
        </Link>
      </div>

      {/* Brand + Model selectors */}
      <div className="card !p-5">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Brand */}
          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
              {lang === "th" ? "เลือกยี่ห้อรถยนต์" : "Select Vehicle Brand"}
            </label>
            <div className="relative">
              <select
                value={brandId}
                onChange={(e) => onBrand(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {BRANDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
              {lang === "th" ? "เลือกรุ่นรถยนต์" : "Select Car Model"}
            </label>
            <div className="relative">
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {brand.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">{lang === "th" ? "หมวดราคากลาง:" : "Category:"}</span>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-900 font-extrabold border border-blue-100">{vtLabel}</span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-extrabold border border-amber-100">
            {lang === "th" ? "ขนาด" : "Size"} {model.size} · {szLabel}
          </span>
          <span className="ml-auto text-slate-400 font-semibold">
            {loadingLabor
              ? lang === "th" ? "กำลังโหลด…" : "Loading…"
              : `${Object.keys(prices).length} ${lang === "th" ? "รายการชิ้นส่วนในตาราง" : "parts"}`}
          </span>
        </div>
      </div>

      {/* Note */}
      <div className="text-xs text-slate-600 bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center gap-2.5 font-medium">
        <span className="text-base">💡</span>
        <span>
          {lang === "th"
            ? "ราคากลางอ้างอิงตามมาตรฐาน สมาคมอู่กลางการประกันภัย (uklang.com) — จำแนกอัตราค่าแรงเคาะพ่นสีตามหมวดประเภทรถและขนาดตัวถัง"
            : "Standard labor prices source: สมาคมอู่กลางการประกันภัย (uklang.com) — Classifying body repair costs by vehicle type and size."}
        </span>
      </div>

      {/* Diagram + Part list */}
      <div className="grid lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3">
          <div className="card !p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setAngleIdx((i) => (i - 1 + ANGLES.length) % ANGLES.length)}
                className="w-10 h-10 rounded-full border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                aria-label="Previous angle"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div className="text-center">
                <div className="text-xs text-slate-400 font-bold">{brand.name} {model.name}</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {lang === "th" ? ANGLES[angleIdx].labelTh : ANGLES[angleIdx].labelEn}
                </div>
              </div>
              <button
                onClick={() => setAngleIdx((i) => (i + 1) % ANGLES.length)}
                className="w-10 h-10 rounded-full border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                aria-label="Next angle"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </div>

            <CarDiagram
              angle={angle}
              bodyType={bodyType}
              prices={prices}
              selectedPartId={selectedPartId}
              onPartClick={(p) => setSelectedPartId(p.id)}
              lang={lang}
            />

            <div className="mt-4 flex justify-center gap-2">
              {ANGLES.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setAngleIdx(i)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                    i === angleIdx ? "bg-[#0071e3] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "th" ? a.labelTh : a.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Part list sidebar */}
        <div className="lg:col-span-1">
          <div className="card !p-4 sticky top-24">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              {lang === "th" ? "ชิ้นส่วนในมุมนี้" : "Parts in this view"}
            </div>
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {parts.filter((p) => matchedPartTh(p, prices)).map((p) => {
                const isSel = selectedPartId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartId(p.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSel
                        ? "bg-[#0071e3] text-white shadow-xs"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{lang === "th" ? p.labelTh : p.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Source footer */}
      <div className="mt-8 text-xs text-slate-400 text-center font-medium">
        {lang === "th" ? "ที่มาข้อมูลราคากลางอ้างอิง: " : "Price Reference Source: "}
        <a href="https://uklang.com/repair-costs" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-extrabold hover:underline">
          สมาคมอู่กลางการประกันภัย (uklang.com)
        </a>
      </div>
    </div>
  );
}
