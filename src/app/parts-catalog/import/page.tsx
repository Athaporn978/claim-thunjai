"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import * as XLSX from "xlsx";

type ImportLog = {
  id: string;
  filename: string;
  importType: string;
  totalUploaded: number;
  successCount: number;
  failedCount: number;
  performerName: string;
  createdAt: string;
};

type SuccessModalData = {
  isOpen: boolean;
  filename: string;
  importType: string;
  count: number;
};

export default function BulkPriceImportPage() {
  const { lang } = useLang();

  // Separate File & Preview States for Labor Card
  const [laborFile, setLaborFile] = useState<File | null>(null);
  const [laborData, setLaborData] = useState<any[]>([]);
  const [uploadingLabor, setUploadingLabor] = useState(false);

  // Separate File & Preview States for Parts Card
  const [partsFile, setPartsFile] = useState<File | null>(null);
  const [partsData, setPartsData] = useState<any[]>([]);
  const [uploadingParts, setUploadingParts] = useState(false);

  // Drag & Drop Active States
  const [isDraggingLabor, setIsDraggingLabor] = useState(false);
  const [isDraggingParts, setIsDraggingParts] = useState(false);

  // Handle Drag & Drop for Labor
  const handleLaborDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLabor(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setLaborFile(file);
      parseFile(file, setLaborData, [
        { vehicleType: "sedan_asia", partTh: "ฝากระโปรงหน้า", size: "A", minor: 800, moderate: 1500, severe: 2500, replace: 3500 },
        { vehicleType: "sedan_asia", partTh: "กันชนหน้า", size: "A", minor: 700, moderate: 1400, severe: 2200, replace: 3000 },
        { vehicleType: "pickup", partTh: "ประตูหน้าขวา", size: "B", minor: 900, moderate: 1800, severe: 2800, replace: 4200 },
      ]);
    }
  };

  // Handle Drag & Drop for Parts
  const handlePartsDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingParts(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setPartsFile(file);
      parseFile(file, setPartsData, [
        { brand: "Honda", model: "Civic", yearRange: "2018-2023", partTh: "กันชนหน้า (Modulo)", oemPrice: 14500, aftermarketPrice: 7500, usedPrice: 5200 },
        { brand: "Toyota", model: "Camry", yearRange: "2019-2024", partTh: "โคมไฟหน้า LED", oemPrice: 32000, aftermarketPrice: 16500, usedPrice: 12000 },
        { brand: "BYD", model: "Atto 3", yearRange: "2022-2025", partTh: "ฝากระโปรงหน้าอลูมิเนียม", oemPrice: 28000, aftermarketPrice: null, usedPrice: 15000 },
      ]);
    }
  };

  // Success Modal Popup State
  const [successModal, setSuccessModal] = useState<SuccessModalData>({
    isOpen: false,
    filename: "",
    importType: "",
    count: 0,
  });

  // Audit Logs State & Filters
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // User Profile
  const [userProfile, setUserProfile] = useState({
    name: "อรรถ ทดสอบ",
    email: "athaporn@techthunjai.com",
    role: "Super Administrator",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("currentUser") || localStorage.getItem("claim_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name || parsed.email) {
          setUserProfile({
            name: parsed.name || "",
            email: parsed.email || "",
            role: parsed.roleName || parsed.role || "",
          });
        }
      }
    } catch {
      // keep fallback
    }
  }, []);

  const isSuperAdmin =
    userProfile.role.toLowerCase().includes("super") ||
    userProfile.role.toLowerCase().includes("admin") ||
    userProfile.email.toLowerCase().includes("admin@techthunjai.com") ||
    userProfile.email.toLowerCase().includes("athaporn@techthunjai.com");

  const loadAuditLogs = () => {
    setLoadingLogs(true);
    const query = new URLSearchParams();
    if (searchQuery.trim()) query.set("search", searchQuery.trim());
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);

    fetch(`/api/parts-catalog/import/logs?${query.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLogs(d.logs || []);
      })
      .finally(() => setLoadingLogs(false));
  };

  useEffect(() => {
    loadAuditLogs();
  }, [searchQuery, startDate, endDate]);

  // Handle Labor File Upload & Parse
  const handleLaborFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setLaborFile(selected);
    parseFile(selected, setLaborData, [
      { vehicleType: "sedan_asia", partTh: "ฝากระโปรงหน้า", size: "A", minor: 800, moderate: 1500, severe: 2500, replace: 3500 },
      { vehicleType: "sedan_asia", partTh: "กันชนหน้า", size: "A", minor: 700, moderate: 1400, severe: 2200, replace: 3000 },
      { vehicleType: "pickup", partTh: "ประตูหน้าขวา", size: "B", minor: 900, moderate: 1800, severe: 2800, replace: 4200 },
    ]);
  };

  // Handle Parts File Upload & Parse
  const handlePartsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setPartsFile(selected);
    parseFile(selected, setPartsData, [
      { brand: "Honda", model: "Civic", yearRange: "2018-2023", partTh: "กันชนหน้า (Modulo)", oemPrice: 14500, aftermarketPrice: 7500, usedPrice: 5200 },
      { brand: "Toyota", model: "Camry", yearRange: "2019-2024", partTh: "โคมไฟหน้า LED", oemPrice: 32000, aftermarketPrice: 16500, usedPrice: 12000 },
      { brand: "BYD", model: "Atto 3", yearRange: "2022-2025", partTh: "ฝากระโปรงหน้าอลูมิเนียม", oemPrice: 28000, aftermarketPrice: null, usedPrice: 15000 },
    ]);
  };

  const parseFile = (file: File, setData: (data: any[]) => void, fallbackSample: any[]) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (!buffer) return;

        // If JSON file
        if (file.name.endsWith(".json")) {
          const text = new TextDecoder().decode(buffer);
          const json = JSON.parse(text);
          setData(Array.isArray(json) ? json : [json]);
          return;
        }

        // Parse .xlsx, .xls, or .csv using SheetJS XLSX engine across ALL sheets in the workbook
        const workbook = XLSX.read(buffer, { type: "array" });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setData([]);
          return;
        }

        let combinedRows: any[] = [];

        // Detect if workbook is UKlang Matrix format (contains Thai sheet names like เอเชีย, ยุโรป, กระบะ, ตู้, สารอู่กลาง)
        const isUKlangMatrix = workbook.SheetNames.some(
          (s) => s.includes("เอเชีย") || s.includes("ยุโรป") || s.includes("กระบะ") || s.includes("ตู้") || s.includes("สารอู่กลาง")
        );

        if (isUKlangMatrix) {
          const mapSheetToVehicleType = (sheetName: string) => {
            if (sheetName.includes("เอเชีย") || sheetName.includes("asia")) return "sedan_asia";
            if (sheetName.includes("ยุโรป") || sheetName.includes("eu")) return "sedan_eu";
            if (sheetName.includes("กระบะ") || sheetName.includes("pickup")) return "pickup";
            if (sheetName.includes("ตู้") || sheetName.includes("van")) return "van";
            return "sedan_asia";
          };

          for (const name of workbook.SheetNames) {
            if (name.includes("สารอู่กลาง") || name.includes("Sheet3") || name.includes("Index")) continue;
            const vehicleType = mapSheetToVehicleType(name);
            const sheet = workbook.Sheets[name];
            if (!sheet) continue;
            const rawMatrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

            let lastPartTh = "";
            for (let r = 0; r < rawMatrix.length; r++) {
              const row = rawMatrix[r];
              if (!row || row.length === 0) continue;

              const col0 = row[0] ? String(row[0]).trim() : "";
              if (col0 && !col0.includes("หมายเหตุ") && !col0.includes("รายการ") && !col0.includes("ความเสียหาย")) {
                lastPartTh = col0;
              }

              const size = row[1] ? String(row[1]).trim() : "";
              const minor = Number(row[2]) || null;
              const moderate = Number(row[3]) || null;
              const severe = Number(row[4]) || null;
              const replace = Number(row[5]) || null;
              const note = row[6] ? String(row[6]).trim() : "";

              if (lastPartTh && (size === "A" || size === "B" || size === "C" || size === "S" || size === "M" || size === "L")) {
                combinedRows.push({
                  vehicleType,
                  partTh: lastPartTh,
                  size,
                  minor,
                  moderate,
                  severe,
                  replace,
                  note,
                });
              }
            }
          }
        } else {
          // Standard CSV / Excel Flat Table Parsing
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;

            let jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "", raw: false });

            if (!jsonRows || jsonRows.length === 0) {
              const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
              if (rawMatrix && rawMatrix.length > 1) {
                const headers = (rawMatrix[0] || []).map((h: any) => String(h || "").trim());
                jsonRows = rawMatrix.slice(1).map((rowArr: any[]) => {
                  const obj: Record<string, any> = {};
                  headers.forEach((h, idx) => {
                    if (h) obj[h] = rowArr[idx] !== undefined ? String(rowArr[idx]).trim() : "";
                  });
                  return obj;
                });
              }
            }

            if (jsonRows && jsonRows.length > 0) {
              const validRows = jsonRows.filter((r) => {
                const keys = Object.keys(r);
                return keys.some((k) => {
                  const val = String(r[k] || "").trim();
                  return val.length > 0 && val !== "0" && val !== "null";
                });
              });
              combinedRows = combinedRows.concat(validRows);
            }
          }
        }

        console.log(`[UKlang Matrix Engine] Parsed ${combinedRows.length} valid rows from ${file.name}`);
        setData(combinedRows);
      } catch (err) {
        console.error("Parse Excel file error:", err);
        setData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download Templates
  const handleDownloadLaborTemplate = () => {
    const csvContent =
      "vehicleType,partTh,size,minor,moderate,severe,replace,note\n" +
      "sedan_asia,ฝากระโปรงหน้า,A,800,1500,2500,3500,สมาคมอู่กลาง\n" +
      "sedan_eu,กันชนหน้า (M Sport),B,1200,2200,3800,5500,รุ่นพรีเมียม\n";
    downloadCSV(csvContent, "template_labor_price_catalog.csv");
  };

  const handleDownloadPartsTemplate = () => {
    const csvContent =
      "brand,model,yearRange,category,partTh,partEn,oemPrice,aftermarketPrice,usedPrice,note\n" +
      "Honda,Civic,2018-2023,sedan_asia,กันชนหน้า,Front Bumper,14500,7500,5200,เกรด A\n" +
      "BMW,3 Series,2019-2024,sedan_eu,โคมไฟหน้า Laserlight,Headlight Laser,85000,38000,29000,โคมไฟคู่หน้า\n";
    downloadCSV(csvContent, "template_spare_parts_catalog.csv");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Import for Labor Card
  const handleSubmitLabor = async () => {
    if (!laborFile && laborData.length === 0) {
      alert("กรุณาเลือกไฟล์ Excel/CSV อัตราค่าแรงก่อนกดยืนยัน");
      return;
    }
    setUploadingLabor(true);
    try {
      const filename = laborFile?.name || "bulk_labor_import.xlsx";
      const res = await fetch("/api/parts-catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType: "labor",
          filename,
          items: laborData,
          performerName: userProfile.name,
          performerEmail: userProfile.email,
          performerRole: userProfile.role,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessModal({
          isOpen: true,
          filename,
          importType: "ราคาค่าแรง",
          count: data.successCount ?? laborData.length,
        });
        setLaborFile(null);
        setLaborData([]);
        loadAuditLogs();
      } else {
        alert(`❌ ${data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูลค่าแรง"}`);
      }
    } catch {
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setUploadingLabor(false);
    }
  };

  // Submit Import for Spare Parts Card
  const handleSubmitParts = async () => {
    if (!partsFile && partsData.length === 0) {
      alert("กรุณาเลือกไฟล์ Excel/CSV ราคาอะไหล่ก่อนกดยืนยัน");
      return;
    }
    setUploadingParts(true);
    try {
      const filename = partsFile?.name || "bulk_parts_import.xlsx";
      const res = await fetch("/api/parts-catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType: "parts",
          filename,
          items: partsData,
          performerName: userProfile.name,
          performerEmail: userProfile.email,
          performerRole: userProfile.role,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessModal({
          isOpen: true,
          filename,
          importType: "ราคาค่าอะไหล่",
          count: data.successCount ?? partsData.length,
        });
        setPartsFile(null);
        setPartsData([]);
        loadAuditLogs();
      } else {
        alert(`❌ ${data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูลอะไหล่"}`);
      }
    } catch {
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setUploadingParts(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/parts-catalog" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition">
              ← {lang === "th" ? "กลับไปหน้าคลังราคาค่าอะไหล่" : "Back to Parts Catalog"}
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
            <span>📤</span> {lang === "th" ? "อัปเดตราคากลางแบบ Bulk (Excel Import)" : "Bulk Price Catalog Update"}
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            {lang === "th"
              ? "แยกกล่องการอัปโหลดอัตราค่าแรงและราคาอะไหล่ออกจากกันอย่างชัดเจน ป้องกันการสลับไฟล์ผิดพลาด"
              : "Dedicated cards for Labor Rates & Spare Parts import with audit log filters"}
          </p>
        </div>

        {/* User Badge */}
        <div className="bg-blue-50 border border-blue-200/80 rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center font-black text-xs shadow-xs">
            SA
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900">{userProfile.name}</div>
            <div className="text-[10px] text-blue-600 font-bold">{userProfile.role}</div>
          </div>
        </div>
      </div>

      {/* Role Permission Banner */}
      {!isSuperAdmin ? (
        <div className="card !p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
          <span className="text-4xl">🚫</span>
          <h3 className="text-lg font-black text-rose-900">ไม่มีสิทธิ์เข้าถึง (Access Denied)</h3>
          <p className="text-xs text-rose-700 font-medium max-w-xl mx-auto">
            เฉพาะผู้ใช้งานบทบาท <span className="font-extrabold underline">Super Administrator</span> เท่านั้นที่มีสิทธิ์เข้าถึงและอัปเดตข้อมูลราคากลางแบบ Bulk ลงฐานข้อมูล
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Two Separate Dedicated Upload Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Labor Rates Upload Card */}
            <div className="card !p-6 bg-white border border-amber-200/90 rounded-3xl shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📖</span>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {lang === "th" ? "Update ราคาค่าแรง (Labor Rates)" : "Update Labor Rates"}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        คลังอัตราค่าแรงซ่อมเคาะพ่นสีแบ่งตามขนาดและระดับความเสียหาย
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadLaborTemplate}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-extrabold text-[11px] hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥</span> Template (.csv)
                  </button>
                </div>

                {/* Upload Box */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingLabor(true); }}
                  onDragLeave={() => setIsDraggingLabor(false)}
                  onDrop={handleLaborDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 transition ${
                    isDraggingLabor
                      ? "border-amber-500 bg-amber-100/70 ring-4 ring-amber-300 scale-[1.01]"
                      : "border-amber-200 bg-amber-50/30 hover:border-amber-400"
                  }`}
                >
                  <div className="w-10 h-10 mx-auto rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
                    📄
                  </div>
                  <div className="text-xs text-slate-700 font-bold">
                    {lang === "th" ? "เลือกหรือลากวางไฟล์ Excel อัตราค่าแรงซ่อม" : "Upload Labor Excel file"}
                  </div>
                  <label className="inline-block px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-extrabold hover:bg-amber-700 cursor-pointer shadow-xs transition">
                    {lang === "th" ? "เลือกไฟล์ค่าแรง..." : "Browse Labor File..."}
                    <input type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleLaborFileChange} className="hidden" />
                  </label>

                  {laborFile && (
                    <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-amber-200 text-xs font-extrabold text-amber-900 shadow-2xs mt-2">
                      <span>📎</span>
                      <span>{laborFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Preview Table for Labor */}
                {laborFile && (
                  <div className="space-y-2">
                    {(() => {
                      const validLaborRows = laborData
                        .map((r) => {
                          const getVal = (...keys: string[]) => {
                            for (const key of Object.keys(r)) {
                              const kClean = key.trim().toLowerCase();
                              for (const target of keys) {
                                if (kClean === target.toLowerCase() || kClean.includes(target.toLowerCase())) {
                                  return r[key];
                                }
                              }
                            }
                            return "";
                          };
                          const partTh = getVal("partth", "part", "partname", "name", "description", "รายการ", "รายการซ่อม", "ชื่อชิ้นส่วน", "ชิ้นส่วน", "ชื่อรายการ", "รายการอะไหล่", "ชื่ออะไหล่", "คำอธิบาย");
                          const vehicleType = getVal("vehicletype", "ประเภทรถ", "กลุ่มรถ", "ประเภท");
                          const size = getVal("size", "ขนาด", "ไซส์");
                          const replace = getVal("replace", "เปลี่ยน", "เปลี่ยนใหม่", "ราคาเปลี่ยน", "ราคาศูนย์", "ราคาห้าง", "ราคา", "minor", "ซ่อมเบา");
                          return {
                            partTh: String(partTh || "").trim(),
                            vehicleType: vehicleType ? String(vehicleType).trim() : "-",
                            size: size ? String(size).trim() : "-",
                            price: replace ? Number(replace) : 0,
                          };
                        })
                        .filter((item) => item.partTh.length > 1);

                      if (validLaborRows.length === 0) {
                        return (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-800 font-extrabold">
                              <span>⚠️</span>
                              <span>ไม่พบรายการอัตราค่าแรงซ่อมที่ถูกต้องในไฟล์นี้</span>
                            </div>
                            <p className="text-[11px] text-amber-700 font-normal leading-relaxed">
                              คอลัมน์ในไฟล์ที่อัปโหลดไม่ตรงกับโครงสร้างอัตราค่าแรง หรือเป็นไฟล์ประเภทราคาอะไหล่ กรุณาอัปโหลดไฟล์ให้ตรงตาม Template
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                            <span>🔍 {lang === "th" ? `ตัวอย่างข้อมูลค่าแรงที่อ่านได้จริง (${validLaborRows.length} รายการ)` : `Valid Labor Preview (${validLaborRows.length} items)`}</span>
                          </div>
                          <div className="overflow-x-auto border border-amber-200/80 rounded-xl max-h-48 overflow-y-auto">
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead className="bg-amber-50 text-amber-900 font-extrabold sticky top-0">
                                <tr>
                                  <th className="py-2 px-3">ประเภท</th>
                                  <th className="py-2 px-3">รายการซ่อม</th>
                                  <th className="py-2 px-3">ไซส์</th>
                                  <th className="py-2 px-3 text-right">เปลี่ยนใหม่/ราคา</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100 font-bold text-slate-700">
                                {validLaborRows.slice(0, 5).map((r, i) => (
                                  <tr key={i}>
                                    <td className="py-2 px-3">{r.vehicleType}</td>
                                    <td className="py-2 px-3 font-extrabold text-slate-900">{r.partTh}</td>
                                    <td className="py-2 px-3">{r.size}</td>
                                    <td className="py-2 px-3 text-right text-blue-600 font-black">
                                      {r.price > 0 ? `฿${r.price.toLocaleString()}` : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Confirm Button Labor */}
              <div className="pt-4 border-t border-amber-100">
                <button
                  onClick={handleSubmitLabor}
                  disabled={uploadingLabor || !laborFile}
                  className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold hover:bg-amber-700 disabled:opacity-40 cursor-pointer shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2"
                >
                  {uploadingLabor ? (
                    <>
                      <span className="animate-spin">⚙️</span> กำลังอัปเดตอัตราค่าแรง...
                    </>
                  ) : (
                    <>
                      <span>🚀</span> {lang === "th" ? "ยืนยัน Update ราคาค่าแรง" : "Confirm Update Labor Rates"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Spare Parts Upload Card */}
            <div className="card !p-6 bg-white border border-blue-200/90 rounded-3xl shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {lang === "th" ? "Update ราคาค่าอะไหล่" : "Update Spare Parts Catalog"}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        คลังราคากลางอะไหล่รถยนต์ (แท้ศูนย์ OEM / เทียบแท้ / มือสอง)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPartsTemplate}
                    className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-900 font-extrabold text-[11px] hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥</span> Template (.csv)
                  </button>
                </div>

                {/* Upload Box */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingParts(true); }}
                  onDragLeave={() => setIsDraggingParts(false)}
                  onDrop={handlePartsDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 transition ${
                    isDraggingParts
                      ? "border-[#0071e3] bg-blue-100/70 ring-4 ring-blue-300 scale-[1.01]"
                      : "border-blue-200 bg-blue-50/30 hover:border-[#0071e3]"
                  }`}
                >
                  <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 text-[#0071e3] flex items-center justify-center text-xl font-bold">
                    📄
                  </div>
                  <div className="text-xs text-slate-700 font-bold">
                    {lang === "th" ? "เลือกหรือลากวางไฟล์ Excel คลังราคาอะไหล่" : "Upload Spare Parts Excel file"}
                  </div>
                  <label className="inline-block px-4 py-2 rounded-xl bg-[#0071e3] text-white text-xs font-extrabold hover:bg-blue-700 cursor-pointer shadow-xs transition">
                    {lang === "th" ? "เลือกไฟล์ราคาอะไหล่..." : "Browse Parts File..."}
                    <input type="file" accept=".xlsx,.xls,.csv,.json" onChange={handlePartsFileChange} className="hidden" />
                  </label>

                  {partsFile && (
                    <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-blue-200 text-xs font-extrabold text-blue-900 shadow-2xs mt-2">
                      <span>📎</span>
                      <span>{partsFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Preview Table for Parts */}
                {partsFile && (
                  <div className="space-y-2">
                    {(() => {
                      const validPartsRows = partsData
                        .map((r) => {
                          const getVal = (...keys: string[]) => {
                            for (const key of Object.keys(r)) {
                              const kClean = key.trim().toLowerCase();
                              for (const target of keys) {
                                if (kClean === target.toLowerCase() || kClean.includes(target.toLowerCase())) {
                                  return r[key];
                                }
                              }
                            }
                            return "";
                          };
                          const brand = getVal("brand", "ยี่ห้อ", "ยี่ห้อรถยนต์", "ยี่ห้อรถ", "make");
                          const model = getVal("model", "รุ่น", "รุ่นรถยนต์", "รุ่นรถ");
                          const partTh = getVal("partth", "part", "partname", "name", "description", "รายการ", "ชื่ออะไหล่", "รายการชิ้นส่วน", "รายการอะไหล่", "ชิ้นส่วน", "อะไหล่", "ชื่อรายการ", "คำอธิบาย");
                          const oemPrice = getVal("oemprice", "oem", "ราคาแท้", "ราคาศูนย์", "ราคาเบิกศูนย์", "ราคาห้าง", "แท้ศูนย์", "แท้", "ราคา");
                          const aftermarketPrice = getVal("aftermarketprice", "aftermarket", "ราคาเทียบ", "ราคาเทียบแท้", "ราคาอู่", "เทียบแท้", "เทียบ");
                          return {
                            brand: brand ? String(brand).trim() : "-",
                            model: model ? String(model).trim() : "-",
                            partTh: String(partTh || "").trim(),
                            oemPrice: oemPrice ? Number(oemPrice) : 0,
                            aftermarketPrice: aftermarketPrice ? Number(aftermarketPrice) : 0,
                          };
                        })
                        .filter((item) => item.partTh.length > 1);

                      if (validPartsRows.length === 0) {
                        return (
                          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-300 text-blue-900 text-xs font-bold space-y-1">
                            <div className="flex items-center gap-1.5 text-blue-800 font-extrabold">
                              <span>⚠️</span>
                              <span>ไม่พบรายการราคาอะไหล่ที่ถูกต้องในไฟล์นี้</span>
                            </div>
                            <p className="text-[11px] text-blue-700 font-normal leading-relaxed">
                              คอลัมน์ในไฟล์ที่อัปโหลดไม่ตรงกับโครงสร้างราคาอะไหล่ หรือเป็นไฟล์ประเภทอัตราค่าแรง กรุณาอัปโหลดไฟล์ให้ตรงตาม Template
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold text-slate-900">
                            🔍 {lang === "th" ? `ตัวอย่างข้อมูลอะไหล่ที่อ่านได้จริง (${validPartsRows.length} รายการ)` : `Valid Parts Preview (${validPartsRows.length} items)`}
                          </div>
                          <div className="overflow-x-auto border border-blue-200/80 rounded-xl max-h-48 overflow-y-auto">
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead className="bg-blue-50 text-blue-900 font-extrabold sticky top-0">
                                <tr>
                                  <th className="py-2 px-3">ยี่ห้อ/รุ่น</th>
                                  <th className="py-2 px-3">รายการอะไหล่</th>
                                  <th className="py-2 px-3 text-right">แท้ศูนย์</th>
                                  <th className="py-2 px-3 text-right">เทียบแท้</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100 font-bold text-slate-700">
                                {validPartsRows.slice(0, 5).map((r, i) => (
                                  <tr key={i}>
                                    <td className="py-2 px-3">
                                      <span className="bg-[#0071e3] text-white px-1.5 py-0.5 rounded text-[9px] mr-1">
                                        {r.brand}
                                      </span>
                                      {r.model}
                                    </td>
                                    <td className="py-2 px-3 font-extrabold text-slate-900">{r.partTh}</td>
                                    <td className="py-2 px-3 text-right text-blue-900 font-black">
                                      {r.oemPrice > 0 ? `฿${r.oemPrice.toLocaleString()}` : "-"}
                                    </td>
                                    <td className="py-2 px-3 text-right text-emerald-700">
                                      {r.aftermarketPrice > 0 ? `฿${r.aftermarketPrice.toLocaleString()}` : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Confirm Button Parts */}
              <div className="pt-4 border-t border-blue-100">
                <button
                  onClick={handleSubmitParts}
                  disabled={uploadingParts || !partsFile}
                  className="w-full py-2.5 rounded-xl bg-[#0071e3] text-white text-xs font-extrabold hover:bg-blue-700 disabled:opacity-40 cursor-pointer shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  {uploadingParts ? (
                    <>
                      <span className="animate-spin">⚙️</span> กำลังอัปเดตคลังราคาอะไหล่...
                    </>
                  ) : (
                    <>
                      <span>🚀</span> {lang === "th" ? "ยืนยัน Update ราคาค่าอะไหล่" : "Confirm Update Spare Parts Catalog"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Audit Log History Timeline & Search Filter Section */}
          <div className="card !p-6 bg-white border border-slate-200/90 rounded-3xl shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📜</span> {lang === "th" ? "ประวัติการอัปเดตราคากลาง (Audit Log History Timeline)" : "Bulk Import Audit Log History"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  บันทึกประวัติการนำเข้าไฟล์ Excel แยกประเภท พร้อมระบบค้นหาและตัวกรองวันที่
                </p>
              </div>

              {/* Search & Date Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 md:w-56">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === "th" ? "ค้นหาชื่อไฟล์, บัญชีผู้ใช้..." : "Search file or account..."}
                    className="w-full px-3 py-1.5 pl-8 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>

                {/* Date Picker Start */}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                <span className="text-slate-400 text-xs font-medium">-</span>

                {/* Date Picker End */}
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />

                <button
                  onClick={loadAuditLogs}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer transition"
                >
                  🔄
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">กำลังค้นหาประวัติ Audit Log...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">
                ไม่พบประวัติการอัปเดตราคากลางแบบ Bulk ตามเงื่อนไขที่ค้นหา
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/90 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-center">วัน-เวลาที่อัปโหลด</th>
                      <th className="py-3 px-4 text-center">ผู้ทำรายการ (Account / Super Admin)</th>
                      <th className="py-3 px-4 text-center">ประเภทราคากลาง</th>
                      <th className="py-3 px-4 text-center">ชื่อไฟล์ Excel</th>
                      <th className="py-3 px-4 text-center">จำนวนรายการ</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] text-center">
                          {new Date(log.createdAt).toLocaleString(lang === "th" ? "th-TH" : "en-US")}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className="text-[#0071e3]">👤</span>
                            <span>{log.performerName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                              log.importType.includes("ค่าแรง")
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-blue-50 text-blue-900 border-blue-200"
                            }`}
                          >
                            {log.importType.includes("ค่าแรง") ? "📖 ราคาค่าแรง" : "📦 ราคาค่าอะไหล่"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 text-center">{log.filename}</td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                          {log.successCount} รายการ
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                            ✅ SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Notification Modal Popup */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-fade-in">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-black shadow-xs">
              ✅
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">อัปเดตข้อมูลราคากลางเรียบร้อยแล้ว</h3>
              <p className="text-xs text-slate-600 font-semibold mt-2 leading-relaxed">
                คุณได้อัปเดตไฟล์ราคา <span className="font-extrabold text-blue-600 font-mono">"{successModal.filename}"</span>
                <br />
                (ประเภท: <span className="font-extrabold text-slate-900">{successModal.importType}</span>)
                <br />
                ลงระบบเรียบร้อยแล้วจำนวน <span className="font-black text-emerald-600 text-sm">{successModal.count.toLocaleString()}</span> รายการ
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
                className="w-full py-3 rounded-2xl bg-[#0071e3] text-white font-extrabold text-xs hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition"
              >
                ตกลง / ปิดหน้าต่าง (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
