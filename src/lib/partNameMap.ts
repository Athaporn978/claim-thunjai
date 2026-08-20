/**
 * Part name normalization for price matching.
 *
 * Converts AI-returned English names and repair-shop Thai shorthand
 * into the standard Thai part names used in the RepairPrice / labor-Excel tables.
 *
 * Usage:
 *   const { standardName, position } = normalizePart("Left Front Fender");
 *   // → { standardName: "บังโคลนหน้า", position: "L" }
 */

// ---------------------------------------------------------------------------
// 1. Position detection
// ---------------------------------------------------------------------------

// "ซ่าย" is a common shop-typo for "ซ้าย" (missing the tone mark) — seen in real
// labor-code sheets, so it's tolerated alongside the correct spelling.
const L_PATTERNS = /ซ้าย|ซ่าย|left|lh|\bsl\b|\bfl\b|\brl\b|\(l\)|\bl\b/i;
const R_PATTERNS = /ขวา|right|rh|\bsr\b|\bfr\b|\brr\b|\(r\)|\br\b/i;

export function normalizePosition(text: string): "L" | "R" | null {
  if (L_PATTERNS.test(text)) return "L";
  if (R_PATTERNS.test(text)) return "R";
  return null;
}

/** Strip position words so they don't interfere with part name lookup */
function stripPosition(text: string): string {
  return text
    .replace(/\b(left|right|lh|rh|sl|sr|fl|fr|rl|rr)\b/gi, "")
    .replace(/(ซ้าย|ซ่าย|ขวา)/g, "")
    .replace(/[\(\)]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Repair-shop action-code prefixes (from real labor-code sheets) that precede the
// part name, e.g. "ซ/พ กันชนหน้า" = ซ่อมพ่นสีกันชนหน้า, "ป/พ ประตูหน้าซ้าย" = เปลี่ยนพ่นสีประตูหน้าซ้าย.
// These describe the ACTION (repair/replace/spray/disassemble), not the part — strip them
// before part-name lookup so they can't cause a false substring match.
const ACTION_PREFIX_PATTERN = /^(ถอด[-\s]?ใส่|ถอดประกอบ|ซ\/พ\.?|ป\/พ\.?|ซ\.|ป\.)\s*/i;

function stripActionPrefix(text: string): string {
  return text.replace(ACTION_PREFIX_PATTERN, "").trim();
}

// ---------------------------------------------------------------------------
// 2. Part name map  (lowercase key → standard Thai name)
// ---------------------------------------------------------------------------
// Keys: English names (from AI damage analysis), Thai shorthand / variants.
// Standard Thai values must exactly match what is in the labor-Excel "Subject" column.

const PART_MAP: Record<string, string> = {
  // ── กันชนหน้า (Front Bumper) ─────────────────────────────────────────────
  "front bumper":             "กันชนหน้า",
  "front bumper assembly":    "กันชนหน้า",
  "bumper front":             "กันชนหน้า",
  "f bumper":                 "กันชนหน้า",
  "กันชนหน้า":                "กันชนหน้า",
  "กันชน f":                  "กันชนหน้า",
  "กันชน f.":                 "กันชนหน้า",
  "บัมเปอร์หน้า":              "กันชนหน้า",
  "บัมเปอร์ f":               "กันชนหน้า",
  "บัมเปอร์":                  "กันชนหน้า",   // context: front-only doc

  // ── กันชนหลัง (Rear Bumper) ──────────────────────────────────────────────
  "rear bumper":              "กันชนหลัง",
  "rear bumper assembly":     "กันชนหลัง",
  "bumper rear":              "กันชนหลัง",
  "r bumper":                 "กันชนหลัง",
  "กันชนหลัง":                "กันชนหลัง",
  "กันชน r":                  "กันชนหลัง",
  "กันชน r.":                 "กันชนหลัง",
  "บัมเปอร์หลัง":              "กันชนหลัง",
  "บัมเปอร์ r":               "กันชนหลัง",

  // ── ฝากระโปรงหน้า (Hood / Bonnet) ───────────────────────────────────────
  "hood":                     "ฝากระโปรงหน้า",
  "bonnet":                   "ฝากระโปรงหน้า",
  "engine hood":              "ฝากระโปรงหน้า",
  "front hood":               "ฝากระโปรงหน้า",
  "ฝากระโปรงหน้า":            "ฝากระโปรงหน้า",
  "โบนเน็ต":                  "ฝากระโปรงหน้า",
  "ฝาโบนเน็ต":                "ฝากระโปรงหน้า",
  "ฝากระโปรง":                "ฝากระโปรงหน้า",

  // ── ฝาท้าย (Trunk Lid / Tailgate) ────────────────────────────────────────
  "trunk lid":                "ฝาท้าย",
  "trunk":                    "ฝาท้าย",
  "tailgate":                 "ฝาท้าย",
  "boot lid":                 "ฝาท้าย",
  "liftgate":                 "ฝาท้าย",
  "rear hatch":               "ฝาท้าย",
  "ฝาท้าย":                   "ฝาท้าย",
  "ฝากระโปรงหลัง":            "ฝาท้าย",
  "ฝาหลัง":                   "ฝาท้าย",
  "เทลเกต":                   "ฝาท้าย",
  "ประตูท้าย":                 "ฝาท้าย",

  // ── บังโคลนหน้า (Front Fender) ───────────────────────────────────────────
  "front fender":             "บังโคลนหน้า",
  "fender front":             "บังโคลนหน้า",
  "front wing":               "บังโคลนหน้า",
  "บังโคลนหน้า":              "บังโคลนหน้า",
  "บังโคลน f":                "บังโคลนหน้า",
  "บังโคลน":                  "บังโคลนหน้า",   // context default
  "เฟนเดอร์หน้า":             "บังโคลนหน้า",
  "แผงบังโคลนหน้า":           "บังโคลนหน้า",
  "แก้มบังโคลนหน้า":          "บังโคลนหน้า",   // shop shorthand (labor-code sheet)

  // ── บังโคลนหลัง / ควอเตอร์แพนแนล (Quarter Panel / Rear Fender) ──────────
  "quarter panel":            "บังโคลนหลัง",
  "rear fender":              "บังโคลนหลัง",
  "rear quarter panel":       "บังโคลนหลัง",
  "rear wing":                "บังโคลนหลัง",
  "บังโคลนหลัง":              "บังโคลนหลัง",
  "ควอเตอร์":                 "บังโคลนหลัง",
  "ควอเตอร์แพนแนล":           "บังโคลนหลัง",
  "แผงข้างหลัง":              "บังโคลนหลัง",
  "เฟนเดอร์หลัง":             "บังโคลนหลัง",
  "แผงบังโคลนหลัง":           "บังโคลนหลัง",
  "แก้มบังโคลนหลัง":          "บังโคลนหลัง",   // shop shorthand (labor-code sheet)
  "แก้มบังโคลน":              "บังโคลนหลัง",   // shop shorthand — bare form defaults to rear
  // Pickup-truck bed side panel — ISUZU's own catalog labels this
  // "บังโคลนหลัง(แผงข้างกระบะ)", confirming it's the same part as บังโคลนหลัง.
  "แผงข้างกระบะ":             "บังโคลนหลัง",
  "แผงกระบะข้าง":             "บังโคลนหลัง",
  "แผงกระบะ":                 "บังโคลนหลัง",
  "ซับในแผงกระบะ":            "ซับในบังโคลนหลัง",

  // ── ประตูหน้า (Front Door) ────────────────────────────────────────────────
  "front door":               "ประตูหน้า",
  "door front":               "ประตูหน้า",
  "front door panel":         "ประตูหน้า",
  "ประตูหน้า":                "ประตูหน้า",
  "บานประตูหน้า":             "ประตูหน้า",
  "ประตู f":                  "ประตูหน้า",

  // ── ประตูหลัง (Rear Door) ─────────────────────────────────────────────────
  "rear door":                "ประตูหลัง",
  "door rear":                "ประตูหลัง",
  "rear door panel":          "ประตูหลัง",
  "ประตูหลัง":                "ประตูหลัง",
  "บานประตูหลัง":             "ประตูหลัง",
  "ประตู r":                  "ประตูหลัง",

  // ── กาบข้างล่าง / โรคเกอร์ (Rocker Panel / Side Skirt) ──────────────────
  "rocker panel":             "กาบข้างล่าง",
  "sill panel":               "กาบข้างล่าง",
  "side sill":                "กาบข้างล่าง",
  "rocker":                   "กาบข้างล่าง",
  "กาบข้างล่าง":              "กาบข้างล่าง",
  "กาบข้าง":                  "กาบข้างล่าง",
  "คิ้วข้างล่าง":             "กาบข้างล่าง",
  "ชายข้าง":                  "กาบข้างล่าง",
  "สเกิร์ตข้าง":              "กาบข้างล่าง",

  // ── หลังคา (Roof) ─────────────────────────────────────────────────────────
  "roof":                     "หลังคา",
  "roof panel":               "หลังคา",
  "หลังคา":                   "หลังคา",
  "แผงหลังคา":                "หลังคา",

  // ── เสาหลังคา (Pillars) ───────────────────────────────────────────────────
  "a pillar":                 "เสา A",
  "a-pillar":                 "เสา A",
  "b pillar":                 "เสา B",
  "b-pillar":                 "เสา B",
  "c pillar":                 "เสา C",
  "c-pillar":                 "เสา C",
  "เสา a":                    "เสา A",
  "เสา b":                    "เสา B",
  "เสา c":                    "เสา C",
  "เสาหลังเก๋ง":               "เสา C",   // shop shorthand — cab's rear pillar

  // ── กระจกหน้า (Windshield) ───────────────────────────────────────────────
  "windshield":               "กระจกหน้า",
  "windscreen":               "กระจกหน้า",
  "front windshield":         "กระจกหน้า",
  "กระจกหน้า":                "กระจกหน้า",
  "กระจกหน้ารถ":              "กระจกหน้า",
  "กระจกหน้าแผ่นใหญ่":        "กระจกหน้า",

  // ── กระจกหลัง (Rear Window) ──────────────────────────────────────────────
  "rear window":              "กระจกหลัง",
  "rear windshield":          "กระจกหลัง",
  "back glass":               "กระจกหลัง",
  "กระจกหลัง":                "กระจกหลัง",

  // ── กระจกประตู (Door Glass / Window) ─────────────────────────────────────
  "door glass":               "กระจกประตู",
  "side window":              "กระจกประตู",
  "window glass":             "กระจกประตู",
  "กระจกประตู":               "กระจกประตู",
  "กระจกข้าง":                "กระจกประตู",

  // ── กระจกมองข้าง (Side Mirror) ───────────────────────────────────────────
  "side mirror":              "กระจกมองข้าง",
  "door mirror":              "กระจกมองข้าง",
  "wing mirror":              "กระจกมองข้าง",
  "outside mirror":           "กระจกมองข้าง",
  "กระจกมองข้าง":             "กระจกมองข้าง",
  "กระจกข้างนอก":             "กระจกมองข้าง",
  "ฝาครอบกระจกมองข้าง":       "กระจกมองข้าง",
  "เปลือกกระจกมองข้าง":       "กระจกมองข้าง",

  // ── ไฟหน้า (Headlight) ───────────────────────────────────────────────────
  "headlight":                "ไฟหน้า",
  "headlamp":                 "ไฟหน้า",
  "headlight assembly":       "ไฟหน้า",
  "front light":              "ไฟหน้า",
  "ไฟหน้า":                   "ไฟหน้า",
  "โคมไฟหน้า":                "ไฟหน้า",
  "ไฟหน้าชุด":                "ไฟหน้า",

  // ── เบ้าไฟหน้า (Headlight housing/bracket) — priced separately from the
  // headlight assembly itself in some labor-code sheets (e.g. ISUZU), so it
  // is its own canonical term rather than an alias of "ไฟหน้า".
  "เบ้าไฟหน้า":               "เบ้าไฟหน้า",

  // ── ไฟท้าย (Taillight) ───────────────────────────────────────────────────
  "taillight":                "ไฟท้าย",
  "tail lamp":                "ไฟท้าย",
  "taillight assembly":       "ไฟท้าย",
  "rear light":               "ไฟท้าย",
  "brake light":              "ไฟท้าย",
  "ไฟท้าย":                   "ไฟท้าย",
  "โคมไฟท้าย":                "ไฟท้าย",
  "ไฟท้ายชุด":                "ไฟท้าย",

  // ── เบ้าไฟท้าย (Taillight housing/bracket) — same reasoning as เบ้าไฟหน้า.
  "เบ้าไฟท้าย":               "เบ้าไฟท้าย",

  // ── ไฟตัดหมอก (Fog Light) ────────────────────────────────────────────────
  "fog light":                "ไฟตัดหมอก",
  "fog lamp":                 "ไฟตัดหมอก",
  "ไฟตัดหมอก":                "ไฟตัดหมอก",
  "ไฟหมอก":                   "ไฟตัดหมอก",

  // ── กระจัง (Grille) ──────────────────────────────────────────────────────
  "grille":                   "กระจัง",
  "front grille":             "กระจัง",
  "radiator grille":          "กระจัง",
  "กระจัง":                   "กระจัง",
  "หน้ากระจัง":               "กระจัง",
  "แผงกระจัง":                "กระจัง",

  // ── ล้อแม็ก / กะทะล้อ (Wheel / Rim) ─────────────────────────────────────
  "wheel":                    "ล้อแม็ก",
  "rim":                      "ล้อแม็ก",
  "alloy wheel":              "ล้อแม็ก",
  "steel wheel":              "กะทะล้อเหล็ก",
  "wheel rim":                "ล้อแม็ก",
  "ล้อแม็ก":                  "ล้อแม็ก",
  "แม็ก":                     "ล้อแม็ก",
  "กะทะล้อ":                  "กะทะล้อเหล็ก",
  "กะทะล้อเหล็ก":             "กะทะล้อเหล็ก",

  // ── ยาง (Tire) ────────────────────────────────────────────────────────────
  "tire":                     "ยาง",
  "tyre":                     "ยาง",
  "ยาง":                      "ยาง",
  "ยางรถ":                    "ยาง",

  // ── ถังน้ำมัน (Fuel Tank) — shop shorthand from labor-code sheet ─────────
  "ฝาปิดถังน้ำมัน":            "ฝาปิดถังน้ำมัน",
  "เบ้ายึดถังน้ำมัน":          "เบ้ายึดถังน้ำมัน",

  // ── แผงหน้า / คานกันชน (Bumper Beam / Crash Bar) ─────────────────────────
  "bumper beam":              "คานกันชนหน้า",
  "front crash bar":          "คานกันชนหน้า",
  "คานกันชนหน้า":             "คานกันชนหน้า",
  "คานกันชน":                 "คานกันชนหน้า",
  "คานรับกันชนหน้า":          "คานกันชนหน้า",

  // ── สปอยเลอร์ (Spoiler) ──────────────────────────────────────────────────
  "spoiler":                  "สปอยเลอร์",
  "rear spoiler":             "สปอยเลอร์หลัง",
  "front spoiler":            "สปอยเลอร์หน้า",
  "สปอยเลอร์":                "สปอยเลอร์",
  "สปอยเลอร์หลัง":            "สปอยเลอร์หลัง",
  "สปอยเลอร์หน้า":            "สปอยเลอร์หน้า",
};

// ---------------------------------------------------------------------------
// 3. Normalize function
// ---------------------------------------------------------------------------

export type NormalizedPart = {
  standardName: string | null;  // Thai standard name; null if not found in map
  position: "L" | "R" | null;  // Left / Right; null if not applicable
  originalText: string;
};

// Keys sorted longest-first so a specific compound term (e.g. "เบ้าไฟท้าย") wins over
// a shorter generic substring it contains (e.g. "ไฟท้าย") during starts-with/substring
// matching. Insertion order alone is not reliable for this — length must be explicit.
const PART_MAP_KEYS_BY_LENGTH = Object.keys(PART_MAP).sort((a, b) => b.length - a.length);

/**
 * Normalizes a part name string (English or Thai, with or without L/R)
 * into a standard Thai name and a position indicator.
 *
 * @param text  Raw part name, e.g. "Left Front Fender", "บังโคลนหน้าซ้าย", "กันชน L"
 */
export function normalizePart(text: string): NormalizedPart {
  const original = text;
  const position = normalizePosition(text);

  // Strip action-code prefixes (ซ/พ, ป/พ, ถอด-ใส่, ...) and position words
  // before looking up the part name.
  const cleaned = stripPosition(stripActionPrefix(text)).toLowerCase().trim();

  // 1. Exact match
  if (PART_MAP[cleaned]) {
    return { standardName: PART_MAP[cleaned], position, originalText: original };
  }

  // 2. Starts-with match (handles trailing submodel suffixes)
  for (const key of PART_MAP_KEYS_BY_LENGTH) {
    if (cleaned.startsWith(key) || key.startsWith(cleaned)) {
      return { standardName: PART_MAP[key], position, originalText: original };
    }
  }

  // 3. Substring match (most permissive)
  for (const key of PART_MAP_KEYS_BY_LENGTH) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return { standardName: PART_MAP[key], position, originalText: original };
    }
  }

  // 4. Not found — return null so caller falls back to keyword search
  return { standardName: null, position, originalText: original };
}

/**
 * Quick helper: just get the standardized Thai name or the original text as fallback.
 */
export function toStandardPartName(text: string): string {
  return normalizePart(text).standardName ?? text;
}
