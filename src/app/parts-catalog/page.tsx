"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/LangContext";

interface PartPriceItem {
  id: number;
  brand: string;
  model: string;
  yearRange: string;
  category: string;
  partTh: string;
  partEn: string | null;
  oemPrice: number;
  aftermarketPrice: number | null;
  usedPrice: number | null;
  note: string | null;
}

export default function PartsCatalogPage() {
  const { lang } = useLang();
  const [partBrandFilter, setPartBrandFilter] = useState<string>("all");
  const [partModelFilter, setPartModelFilter] = useState<string>("all");
  const [partSearch, setPartSearch] = useState<string>("");
  const [partPrices, setPartPrices] = useState<PartPriceItem[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableModelsByBrand, setAvailableModelsByBrand] = useState<Record<string, string[]>>({});
  const [loadingParts, setLoadingParts] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset to page 1 whenever filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [partBrandFilter, partModelFilter, partSearch, pageSize]);

  // Fetch Spare Parts Prices
  useEffect(() => {
    setLoadingParts(true);
    const query = new URLSearchParams();
    if (partBrandFilter !== "all") query.set("brand", partBrandFilter);
    if (partModelFilter !== "all") query.set("model", partModelFilter);
    if (partSearch.trim()) query.set("search", partSearch.trim());

    fetch(`/api/part-prices?${query.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPartPrices(d.items || []);
          setAvailableBrands(d.brands || []);
          setAvailableModelsByBrand(d.modelsByBrand || {});
        }
      })
      .finally(() => setLoadingParts(false));
  }, [partBrandFilter, partModelFilter, partSearch]);

  // Helper for model options
  const availableModelsForSelectedBrand = useMemo(() => {
    if (partBrandFilter === "all") {
      const all: string[] = [];
      Object.values(availableModelsByBrand).forEach((list) => {
        list.forEach((m) => {
          if (!all.includes(m)) all.push(m);
        });
      });
      return all.sort();
    }
    return availableModelsByBrand[partBrandFilter] || [];
  }, [partBrandFilter, availableModelsByBrand]);

  // Pagination Calculations
  const totalItems = partPrices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = useMemo(() => {
    return partPrices.slice(startIndex, endIndex);
  }, [partPrices, startIndex, endIndex]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <span>📦</span> {lang === "th" ? "คลังราคากลางอะไหล่รถยนต์" : "Spare Parts Price Catalog"}
        </h1>
        <p className="text-slate-500 mt-1 font-medium text-sm">
          {lang === "th"
            ? "ค้นหาราคาอะไหล่แท้เบิกศูนย์ (OEM), อะไหล่เทียบแท้ (Aftermarket), และราคามือสองอ้างอิงตามยี่ห้อและรุ่นรถยนต์"
            : "Search reference prices for OEM, Aftermarket, and Used spare parts by Make & Model"}
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card !p-5 bg-blue-50/70 border border-blue-200/80 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2 text-slate-900">
              <span>🔍</span> {lang === "th" ? "ค้นหารายการอะไหล่และตัวกรอง" : "Search & Filter Spare Parts"}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {lang === "th"
                ? "เลือกยี่ห้อ, รุ่นรถ หรือ พิมพ์ชื่ออะไหล่ที่ต้องการค้นหาในช่องขวาสุด"
                : "Select brand, model, or type part name in the search input"}
            </p>
          </div>
          <span className="text-xs bg-[#0071e3] text-white font-extrabold px-3.5 py-1.5 rounded-full shadow-xs">
            {partPrices.length} {lang === "th" ? "รายการอะไหล่ในระบบ" : "spare parts"}
          </span>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Brand Filter */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
              {lang === "th" ? "ยี่ห้อรถยนต์ (Brand)" : "Brand"}
            </label>
            <div className="relative">
              <select
                value={partBrandFilter}
                onChange={(e) => {
                  setPartBrandFilter(e.target.value);
                  setPartModelFilter("all");
                }}
                className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0071e3] shadow-xs cursor-pointer"
              >
                <option value="all">{lang === "th" ? "🚗 ทุกยี่ห้อ (All Brands)" : "All Brands"}</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Model Filter */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
              {lang === "th" ? "รุ่นรถยนต์ (Model)" : "Model"}
            </label>
            <div className="relative">
              <select
                value={partModelFilter}
                onChange={(e) => setPartModelFilter(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0071e3] shadow-xs cursor-pointer"
              >
                <option value="all">{lang === "th" ? "🚘 ทุกรุ่นรถ (All Models)" : "All Models"}</option>
                {availableModelsForSelectedBrand.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
              {lang === "th" ? "ค้นหาชื่ออะไหล่" : "Search Part Name"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder={lang === "th" ? "พิมพ์ เช่น กันชนหน้า, ไฟหน้า, ฝากระโปรง..." : "Search e.g. Bumper, Headlight..."}
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] shadow-xs"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        {loadingParts ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm space-y-2">
            <div className="inline-block animate-spin text-2xl">⚙️</div>
            <div>{lang === "th" ? "กำลังโหลดข้อมูลราคาอะไหล่อ้างอิง…" : "Loading spare part prices…"}</div>
          </div>
        ) : partPrices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-4xl">🔍</span>
            <div className="text-slate-700 font-extrabold text-base">
              {lang === "th" ? "ไม่พบข้อมูลราคาอะไหล่ที่ค้นหา" : "No spare part prices found"}
            </div>
            <p className="text-slate-400 text-xs font-medium">
              {lang === "th" ? "ลองเปลี่ยนยี่ห้อ, รุ่นรถ หรือคำค้นหาใหม่อีกครั้ง" : "Try adjusting your filters or search keywords."}
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">{lang === "th" ? "ยี่ห้อ / รุ่น / ปี" : "Brand / Model / Year"}</th>
                    <th className="py-3.5 px-4">{lang === "th" ? "รายการชิ้นส่วนอะไหล่" : "Part Item"}</th>
                    <th className="py-3.5 px-4 text-right">{lang === "th" ? "ราคาแท้ศูนย์ (OEM)" : "OEM Price"}</th>
                    <th className="py-3.5 px-4 text-right">{lang === "th" ? "ราคาเทียบแท้ (Aftermarket)" : "Aftermarket"}</th>
                    <th className="py-3.5 px-4 text-right">{lang === "th" ? "ราคามือสอง (Used)" : "Used Price"}</th>
                    <th className="py-3.5 px-4">{lang === "th" ? "หมายเหตุ" : "Note"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      {/* Brand / Model / Year */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-[#0071e3] text-white font-extrabold text-[11px] shadow-xs">
                            {item.brand}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">{item.model}</span>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.yearRange}
                          </span>
                        </div>
                      </td>

                      {/* Part Item */}
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-900 text-sm">{item.partTh}</div>
                        {item.partEn && <div className="text-[11px] text-slate-400 font-medium">{item.partEn}</div>}
                      </td>

                      {/* OEM Price */}
                      <td className="py-4 px-4 text-right">
                        <span className="inline-block bg-blue-50 text-blue-900 font-black px-3 py-1.5 rounded-xl border border-blue-200 text-sm">
                          ฿{item.oemPrice.toLocaleString()}
                        </span>
                      </td>

                      {/* Aftermarket Price */}
                      <td className="py-4 px-4 text-right">
                        {item.aftermarketPrice ? (
                          <span className="inline-block bg-emerald-50 text-emerald-900 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-200 text-xs">
                            ฿{item.aftermarketPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold">-</span>
                        )}
                      </td>

                      {/* Used Price */}
                      <td className="py-4 px-4 text-right">
                        {item.usedPrice ? (
                          <span className="inline-block bg-amber-50 text-amber-900 font-extrabold px-3 py-1.5 rounded-xl border border-amber-200 text-xs">
                            ฿{item.usedPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold">-</span>
                        )}
                      </td>

                      {/* Note */}
                      <td className="py-4 px-4 text-slate-500 font-medium text-[11px]">
                        {item.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600">
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-3">
                  <span>{lang === "th" ? "แสดงหน้าละ:" : "Items per page:"}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-[#0071e3] shadow-xs cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20 (Default)</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-slate-400 font-medium">
                    {lang === "th"
                      ? `แสดง ${startIndex + 1} - ${endIndex} จากทั้งหมด ${totalItems} รายการ`
                      : `Showing ${startIndex + 1} - ${endIndex} of ${totalItems} items`}
                  </span>
                </div>

                {/* Page Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-extrabold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
                  >
                    {lang === "th" ? "← ก่อนหน้า" : "← Prev"}
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                    if (
                      totalPages > 7 &&
                      pg !== 1 &&
                      pg !== totalPages &&
                      Math.abs(pg - currentPage) > 1
                    ) {
                      if (pg === 2 && currentPage > 3) return <span key={pg} className="px-1 text-slate-400">...</span>;
                      if (pg === totalPages - 1 && currentPage < totalPages - 2) return <span key={pg} className="px-1 text-slate-400">...</span>;
                      return null;
                    }
                    return (
                      <button
                        key={pg}
                        onClick={() => setCurrentPage(pg)}
                        className={`w-8 h-8 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                          currentPage === pg
                            ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/20"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-extrabold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
                  >
                    {lang === "th" ? "ถัดไป →" : "Next →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-slate-400 text-center font-medium">
        {lang === "th" ? "ที่มาข้อมูลราคากลางอ้างอิง: " : "Price Reference Source: "}
        <a href="https://uklang.com/repair-costs" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-extrabold hover:underline">
          สมาคมอู่กลางการประกันภัย & ฐานข้อมูลราคากลางบริษัท H TECHNOLOGY AND SERVICES COMPANY LIMITED
        </a>
      </div>
    </div>
  );
}
