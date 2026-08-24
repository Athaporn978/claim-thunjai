"use client";
import { useEffect, useRef, useState } from "react";
import {
  type QuotationItemInput,
  type ItemType,
  lineQuoted,
  lineControlled,
  lineSaving,
  sectionTotals,
  fmtBaht,
} from "@/lib/quotation";
import { StandardPricePicker } from "./StandardPricePicker";

// Keeps its own draft string while focused so typing a new value never fights the
// parent's reformatted (e.g. .toFixed(2)) display — the classic "must delete digits
// first" complaint. Only reformats from the parent value on blur or external changes.
function NumberCell({
  value,
  onChange,
  className,
  placeholder,
  decimals,
}: {
  value: number;
  onChange: (v: number) => void;
  className: string;
  placeholder: string;
  decimals?: number;
}) {
  const format = (n: number) => (n === 0 ? "" : decimals != null ? n.toFixed(decimals) : String(n));
  const [local, setLocal] = useState(() => format(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d*\.?\d*$/.test(v)) {
          setLocal(v);
          const n = parseFloat(v);
          onChange(Number.isNaN(n) ? 0 : n);
        }
      }}
      onBlur={() => {
        focused.current = false;
        const n = parseFloat(local) || 0;
        setLocal(format(n));
      }}
      className={className}
      placeholder={placeholder}
    />
  );
}

export function ItemsTable({
  title,
  type,
  items,
  onChange,
  vehicleCategory,
  vehicleSize,
  lang,
}: {
  title: string;
  type: ItemType;
  items: QuotationItemInput[];
  onChange: (next: QuotationItemInput[]) => void;
  vehicleCategory: string;
  vehicleSize: string;
  lang: "th" | "en";
}) {
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const rows = items.filter((i) => i.type === type);
  const st = sectionTotals(items, type);

  const updateRow = (rowIdx: number, patch: Partial<QuotationItemInput>) => {
    // map rowIdx (within this type) → index in full items array
    let seen = -1;
    const next = items.map((i) => {
      if (i.type !== type) return i;
      seen++;
      return seen === rowIdx ? { ...i, ...patch } : i;
    });
    onChange(next);
  };

  const addRow = () => {
    const newItem: QuotationItemInput = {
      type, name: "", quotedUnit: 0, quotedQty: 1, controlledUnit: 0, controlledQty: 1, note: "",
    };
    onChange([...items, newItem]);
  };

  const removeRow = (rowIdx: number) => {
    let seen = -1;
    const next = items.filter((i) => {
      if (i.type !== type) return true;
      seen++;
      return seen !== rowIdx;
    });
    onChange(next);
  };

  const inputCls = "w-full min-w-[65px] px-1.5 py-1 text-xs sm:text-sm text-right border border-slate-200 rounded focus:outline-none focus:border-[#0071e3]";
  const qtyInputCls = "w-12 px-1 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:border-[#0071e3] font-mono font-semibold";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-[var(--navy-900)]">{title}</h3>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button
              onClick={() => {
                const next = items.map((item) => {
                  if (item.type !== type) return item;
                  return {
                    ...item,
                    controlledUnit: item.quotedUnit,
                    agreeWithStandard: true,
                    note: lang === "th" ? "คุมเท่าราคาเสนอ" : "Same as quoted",
                  };
                });
                onChange(next);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
            >
              ⚡ {lang === "th" ? "คุมเท่าราคาเสนอทั้งหมด" : "Set all equal to quoted"}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto max-w-full border border-slate-200 rounded-2xl shadow-sm bg-white">
        <table className="w-full text-xs sm:text-sm min-w-[760px]">
          <thead>
            <tr className="text-white text-xs">
              <th rowSpan={2} className="px-3.5 py-3 text-center align-middle font-extrabold bg-[#0b132a] border-r border-white/10 min-w-[180px]">
                {lang === "th" ? "รายการ" : "Item"}
              </th>
              {/* Group 1: Pre-Control / Quoted Price */}
              <th colSpan={3} className="px-3 py-2 text-center align-middle font-extrabold border-r-4 border-slate-400/50 bg-[#1c2844] text-slate-200">
                <span className="inline-flex items-center justify-center gap-1">
                  🏬 {lang === "th" ? "ราคาเสนอจากศูนย์/อู่" : "Quoted Price"}
                </span>
              </th>
              {/* Group 2: Post-Control / Insurer Approved Price */}
              <th colSpan={3} className="px-3 py-2 text-center align-middle font-extrabold border-r-4 border-[#005bb5]/40 bg-gradient-to-r from-[#0071e3] via-blue-600 to-[#005bb5] text-white shadow-sm">
                <span className="inline-flex items-center justify-center gap-1 text-white drop-shadow-xs">
                  🛡️ {lang === "th" ? "ราคาหลังประกันอนุมัติ" : "Approved Price"}
                </span>
              </th>
              {/* Group 3: Saving */}
              <th rowSpan={2} className="px-3 py-3 text-center align-middle font-extrabold border-r border-white/10 bg-gradient-to-b from-orange-500 to-orange-600 min-w-[90px]">
                {lang === "th" ? "ส่วนต่าง (Saving)" : "Saving"}
              </th>
              <th rowSpan={2} className="px-3.5 py-3 text-center align-middle font-extrabold bg-[#0b132a] min-w-[140px]">
                {lang === "th" ? "หมายเหตุ" : "Note"}
              </th>
              <th rowSpan={2} className="px-2 py-2 w-8 bg-[#0b132a]"></th>
            </tr>
            <tr className="text-[11px] font-bold">
              {/* Pre-Control Subheaders */}
              <th className="px-2 py-1.5 text-center align-middle bg-slate-200/90 text-slate-700 min-w-[85px] border-r border-slate-300/60">{lang === "th" ? "ต่อหน่วย" : "Unit"}</th>
              <th className="px-1 py-1.5 text-center align-middle bg-slate-200/90 text-slate-700 w-12 border-r border-slate-300/60">{lang === "th" ? "จำนวน" : "Qty"}</th>
              <th className="px-2 py-1.5 text-center align-middle bg-slate-200/90 text-slate-800 border-r-4 border-slate-400/50 min-w-[80px]">{lang === "th" ? "รวม" : "Total"}</th>
              {/* Post-Control Subheaders */}
              <th className="px-2 py-1.5 text-center align-middle bg-[#dbeafe] text-[#0071e3] min-w-[85px] border-r border-sky-300">{lang === "th" ? "ต่อหน่วย" : "Unit"}</th>
              <th className="px-1 py-1.5 text-center align-middle bg-[#dbeafe] text-[#0071e3] w-12 border-r border-sky-300">{lang === "th" ? "จำนวน" : "Qty"}</th>
              <th className="px-2 py-1.5 text-center align-middle bg-[#dbeafe] text-[#0071e3] border-r-4 border-[#005bb5]/30 min-w-[80px]">{lang === "th" ? "รวม" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-slate-400 py-6 font-semibold">
                  {lang === "th" ? "ยังไม่มีรายการ — กดเพิ่มรายการด้านล่าง" : "No items — add a row below"}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const qTotal = lineQuoted(r);
                const cTotal = lineControlled(r);
                const sav = lineSaving(r);

                return (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/80 align-top transition-colors">
                    {/* Column 1: Item Name with Index Number */}
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                          {idx + 1}
                        </span>
                        <input
                          value={r.name}
                          onChange={(e) => updateRow(idx, { name: e.target.value })}
                          placeholder={lang === "th" ? "ชื่อรายการ" : "Item name"}
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#0071e3] font-semibold text-slate-800"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-8">
                        <button
                          onClick={() => setPickerRow(idx)}
                          className="text-[11px] text-[#0071e3] hover:underline font-bold"
                        >
                          ↧ {lang === "th" ? "ดึงราคากลาง" : "Pull standard"}
                        </button>
                        {r.standardPrice != null && r.standardPrice > 0 && (
                          <span className="text-[11px] text-slate-500 font-mono font-medium">
                            {lang === "th" ? "กลาง:" : "Std:"} {fmtBaht(r.standardPrice, lang)}
                          </span>
                        )}
                        {r.standardPrice === 0 && (
                          <span className="text-[11px] text-slate-600 font-semibold bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded">
                            {lang === "th" ? "ยังไม่มีราคากลาง" : "No standard price"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pre-Control Columns (Cool Slate Tinted Inputs & Total) */}
                    <td className="px-1 py-2.5 bg-slate-50/50">
                      <NumberCell
                        value={r.quotedUnit}
                        onChange={(v) => updateRow(idx, { quotedUnit: v })}
                        decimals={2}
                        className={`${inputCls} font-mono bg-white border-slate-300 text-slate-800 font-medium focus:border-slate-500`}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-1 py-2.5 bg-slate-50/50">
                      <NumberCell
                        value={r.quotedQty}
                        onChange={(v) => updateRow(idx, { quotedQty: v })}
                        className={`${qtyInputCls} bg-white border-slate-300 text-slate-800`}
                        placeholder="1"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold text-slate-700 border-r-4 border-slate-400/40 whitespace-nowrap font-mono bg-slate-100/60">{fmtBaht(qTotal, lang)}</td>

                    {/* Post-Control Columns (Royal Blue Focus Elevated Section) */}
                    <td className="px-1 py-2.5 bg-[#f0f7ff]">
                      <NumberCell
                        value={r.controlledUnit}
                        onChange={(v) => updateRow(idx, { controlledUnit: v, agreeWithStandard: false })}
                        decimals={2}
                        className={`${inputCls} font-mono !bg-white !border-2 !border-[#0071e3] font-extrabold text-[#0071e3] focus:ring-2 focus:ring-blue-200 shadow-xs`}
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => updateRow(idx, { controlledUnit: r.quotedUnit, agreeWithStandard: true, note: lang === "th" ? "คุมเท่าราคาเสนอ" : "Same as quoted" })}
                        className="mt-1 w-full text-[10px] bg-sky-50 hover:bg-[#0071e3] text-[#0071e3] hover:text-white py-0.5 rounded-md font-bold transition border border-sky-200 cursor-pointer shadow-2xs"
                        title={lang === "th" ? "คุมราคาหลังคุมเท่ากับราคาเสนอ" : "Set controlled price equal to quoted"}
                      >
                        = {lang === "th" ? "เท่าราคาเสนอ" : "Same as Quoted"}
                      </button>
                    </td>
                    <td className="px-1 py-2.5 text-center bg-[#f0f7ff]">
                      <NumberCell
                        value={r.controlledQty}
                        onChange={(v) => updateRow(idx, { controlledQty: v })}
                        className={`${qtyInputCls} !bg-white !border-2 !border-[#0071e3] text-[#0071e3] font-bold`}
                        placeholder="1"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-right font-extrabold text-[#0071e3] border-r-4 border-[#005bb5]/30 whitespace-nowrap font-mono bg-sky-100/70">{fmtBaht(cTotal, lang)}</td>

                    {/* Saving Column (Sunset Orange Accent) */}
                    <td className={`px-2 py-2.5 text-right font-extrabold border-r border-slate-100 whitespace-nowrap font-mono ${sav > 0 ? "text-orange-600 bg-orange-50/40" : "text-slate-400"}`}>
                      {fmtBaht(sav, lang)}
                    </td>
                    {/* Note */}
                    <td className="px-2 py-2.5">
                      <input
                        value={r.note || ""}
                        onChange={(e) => updateRow(idx, { note: e.target.value })}
                        placeholder={lang === "th" ? "เหตุผลที่ปรับ…" : "Reason…"}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#0071e3]"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <button onClick={() => removeRow(idx)} className="w-7 h-7 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition" title="ลบ">✕</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-extrabold text-sm">
              <td className="px-3 py-2.5 text-right text-slate-700">{lang === "th" ? "รวมทั้งหมด" : "Total"}</td>
              <td colSpan={2} className="bg-slate-200/40"></td>
              <td className="px-2 py-2.5 text-right border-r-4 border-slate-400/50 whitespace-nowrap font-mono text-slate-800 bg-slate-200/60">{fmtBaht(st.totalQuoted, lang)}</td>
              <td colSpan={2} className="bg-sky-100/40"></td>
              <td className="px-2 py-2.5 text-right text-[#0071e3] border-r-4 border-[#005bb5]/30 whitespace-nowrap font-mono bg-sky-200/70">{fmtBaht(st.totalControlled, lang)}</td>
              <td className="px-2 py-2.5 text-right text-orange-600 border-r border-slate-200 whitespace-nowrap font-mono bg-orange-100/50">{fmtBaht(st.totalSaving, lang)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* AI Explained Reasoning Panel for Labor & Parts Steps */}
      <div className="mt-4 bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-2 text-xs shadow-2xs">
        <div className="font-extrabold text-[#0071e3] flex items-center gap-2">
          <span>✨</span>
          <span>{lang === "th" ? `เหตุผลการคุมราคาหมวด${title}ด้วย AI (AI Explained Reasoning)` : `AI Explained Reasoning for ${title}`}</span>
        </div>
        <div className="text-slate-700 font-medium space-y-1.5 leading-relaxed">
          {st.totalSaving > 0 ? (
            type === "labor" ? (
              <>
                <p className="flex items-start gap-2">
                  <span className="text-[#0071e3] font-bold">🔵</span>
                  <span>คุมชั่วโมงงานเคาะตัวถังและทำสีให้อ้างอิงตามพิกัดชิ้นงานจริงของสมาคมอู่กลางการประกันภัย</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-[#0071e3] font-bold">🔵</span>
                  <span>เปรียบเทียบคำใกล้เคียงชิ้นส่วนซ่อมกับฐานข้อมูลอู่กลางแห่งประเทศไทยเพื่อควบคุมราคามาตรฐาน</span>
                </p>
              </>
            ) : (
              <>
                <p className="flex items-start gap-2">
                  <span className="text-[#0071e3] font-bold">🔵</span>
                  <span>ปรับลดราคาอะไหล่ลงสู่ราคากลางเฉลี่ยสำหรับชิ้นส่วนผลิตร่วม (OES) และอะไหล่ทางเลือกเทียบแท้</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-[#0071e3] font-bold">🔵</span>
                  <span>ตรวจสอบรหัสชิ้นส่วนเบิกศูนย์ OEM เพื่อคุมกรอบราคาตามพิกัดยี่ห้อและรุ่นรถยนต์</span>
                </p>
              </>
            )
          ) : (
            <p className="text-slate-500 italic">
              {lang === "th"
                ? `รายการ${title}ทั้งหมดที่เสนอมาอยู่ในเกณฑ์มาตรฐานที่อนุมัติได้ 100% (ไม่มีส่วนตัดเกินราคามาตรฐาน)`
                : `All ${title} items are within standard approval limits (100% approved).`}
            </p>
          )}
        </div>
      </div>

      <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-[var(--orange-500)] hover:text-[var(--orange-600)] transition">
        + {lang === "th" ? "เพิ่มรายการ" : "Add Item"}
      </button>

      <StandardPricePicker
        open={pickerRow !== null}
        vehicleCategory={vehicleCategory}
        vehicleSize={vehicleSize}
        lang={lang}
        onClose={() => setPickerRow(null)}
        onPick={({ part, tierLabel, price }) => {
          if (pickerRow === null) return;
          const r = rows[pickerRow];
          updateRow(pickerRow, {
            name: r.name?.trim() ? r.name : part,
            controlledUnit: price,
            standardPrice: price,
            note: r.note?.trim() ? r.note : `${tierLabel} · ${lang === "th" ? "ราคากลาง" : "standard"}`,
          });
        }}
      />

    </div>
  );
}
