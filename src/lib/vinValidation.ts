// VIN (Vehicle Identification Number) validation — ISO 3779
// Used by both /analyze and /quotation/new pages.

const TRANSLITERATION: Record<string, number> = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8,
  J:1, K:2, L:3, M:4, N:5,      P:7, R:9,
  S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9,
  "0":0,"1":1,"2":2,"3":3,"4":4,
  "5":5,"6":6,"7":7,"8":8,"9":9,
};
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];

// WMI (first 3 chars) → brand family (lowercase for comparison)
const WMI_MAP: Record<string, string> = {
  // Toyota
  MR1:"toyota", MR2:"toyota", MR3:"toyota",
  JTD:"toyota", JTM:"toyota", JTE:"toyota", JTF:"toyota", JTJ:"toyota",
  "1N4":"nissan",
  // Honda
  MNB:"honda", JHM:"honda",
  "1HG":"honda", "2HG":"honda", "5FN":"honda",
  // Isuzu
  MNA:"isuzu", JAA:"isuzu",
  // Mitsubishi
  MMS:"mitsubishi", MMB:"mitsubishi", MMC:"mitsubishi",
  JA3:"mitsubishi", JA4:"mitsubishi",
  // Nissan
  MNA2:"nissan",
  JN1:"nissan", JN3:"nissan", JN6:"nissan",
  // Mazda
  JM1:"mazda", JM3:"mazda",
  // Ford
  "1FT":"ford", "1FA":"ford", "2FA":"ford", "3FA":"ford",
  // BMW
  WBA:"bmw", WBS:"bmw", WBY:"bmw",
  // Mercedes-Benz
  WDD:"mercedes-benz", WDC:"mercedes-benz",
  // Volkswagen
  WVW:"volkswagen", WV1:"volkswagen", WV2:"volkswagen",
  // Audi
  WAU:"audi", WA1:"audi",
  // Volvo
  YV1:"volvo", YV4:"volvo",
  // Subaru
  JF1:"subaru", JF2:"subaru",
  // Hyundai
  KMH:"hyundai", KM8:"hyundai",
  // Kia
  KNA:"kia", KND:"kia",
};

// Year code (VIN position 10, index 9) → possible model years
const YEAR_MAP: Record<string, number[]> = {
  A:[1980,2010], B:[1981,2011], C:[1982,2012], D:[1983,2013],
  E:[1984,2014], F:[1985,2015], G:[1986,2016], H:[1987,2017],
  J:[1988,2018], K:[1989,2019], L:[1990,2020], M:[1991,2021],
  N:[1992,2022], P:[1993,2023], R:[1994,2024], S:[1995,2025],
  T:[1996,2026], V:[1997,2027], W:[1998,2028], X:[1999,2029],
  Y:[2000,2030],
  "1":[2001], "2":[2002], "3":[2003], "4":[2004], "5":[2005],
  "6":[2006], "7":[2007], "8":[2008], "9":[2009],
};

export type VinResult = {
  formatError: string | null;   // non-null → block submit
  warnings: string[];           // amber warnings, non-blocking
};

/** Returns format error string (th) or null if format is OK */
export function validateVinFormat(vin: string): string | null {
  if (!vin) return null; // empty = skip (field is optional)
  if (vin.length !== 17) return `VIN ต้องมี 17 ตัวอักษร (ขณะนี้มี ${vin.length} ตัว)`;
  if (/[IOQ]/i.test(vin)) return "VIN ห้ามมีตัวอักษร I, O หรือ Q";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return "VIN มีตัวอักษรที่ไม่อนุญาต (ใช้ได้เฉพาะ A-Z ยกเว้น I,O,Q และ 0-9)";
  return null;
}

/** Check digit validation (position 9). Some EU manufacturers skip this. */
function checkDigitValid(vin: string): boolean {
  const sum = vin.toUpperCase().split("").reduce((acc, ch, i) => {
    return acc + (TRANSLITERATION[ch] ?? 0) * WEIGHTS[i];
  }, 0);
  const rem = sum % 11;
  const expected = rem === 10 ? "X" : String(rem);
  return vin[8].toUpperCase() === expected;
}

/** Cross-check WMI (first 3 chars) against a user-provided make string */
function wmiMatchesMake(vin: string, make: string): { matched: boolean; wmiMake: string | null } {
  const wmi3 = vin.slice(0, 3).toUpperCase();
  const wmiMake = WMI_MAP[wmi3] ?? null;
  if (!wmiMake) return { matched: true, wmiMake: null }; // unknown WMI → no judgment
  const makeLower = make.toLowerCase().trim();
  const matched = makeLower.includes(wmiMake) || wmiMake.includes(makeLower);
  return { matched, wmiMake };
}

/** Decode possible years from VIN position 10 */
function vinYears(vin: string): number[] {
  return YEAR_MAP[vin[9]?.toUpperCase()] ?? [];
}

/**
 * Full VIN validation. Returns format error (block) and semantic warnings (non-block).
 * Pass `make` and/or `year` to enable cross-checks.
 */
export function validateVin(
  vin: string,
  opts: { make?: string; year?: string | number } = {}
): VinResult {
  const formatError = validateVinFormat(vin);
  if (formatError || !vin) return { formatError, warnings: [] };

  const warnings: string[] = [];
  const upper = vin.toUpperCase();

  // Check digit
  if (!checkDigitValid(upper)) {
    warnings.push("Check digit ของ VIN ไม่ถูกต้อง — อาจพิมพ์ผิดหรือเป็นเลขที่ไม่ถูกต้อง");
  }

  // WMI vs make
  if (opts.make?.trim()) {
    const { matched, wmiMake } = wmiMatchesMake(upper, opts.make);
    if (!matched && wmiMake) {
      warnings.push(`WMI "${upper.slice(0,3)}" ใน VIN ระบุผู้ผลิต ${wmiMake.toUpperCase()} แต่กรอกยี่ห้อ "${opts.make}" — กรุณาตรวจสอบ`);
    }
  }

  // Year code vs declared year
  if (opts.year) {
    const declaredYear = Number(opts.year);
    const possibleYears = vinYears(upper);
    if (possibleYears.length > 0 && !possibleYears.includes(declaredYear)) {
      warnings.push(`VIN ระบุปีผลิต ${possibleYears.join(" หรือ ")} แต่กรอกปีรถ ${declaredYear} — กรุณาตรวจสอบ`);
    }
  }

  return { formatError: null, warnings };
}
