/**
 * Bridges src/lib/carCatalog.ts (used by the /catalog picker UI) to the real
 * brand/model naming used in LaborPrice (imported from the 21-sheet labor-code
 * Excel — see scripts/import-labor-prices.ts). The two sources were built
 * independently and often name the same brand/model differently:
 *   - BMW: carCatalog "3 Series (320i)" vs LaborPrice "Serie 3"
 *   - Volvo: carCatalog "XC60" vs LaborPrice "60 & 70 Series" (grouped by platform generation)
 *   - GWM/Haval: carCatalog treats it as one brand; LaborPrice split it into two
 *     real distinct brands ("GWM" for Haval models, "ORA" for Ora models)
 *
 * Precision over recall: prefer no match to a WRONG match (e.g. "Sealion 6"
 * must never resolve to BYD "Seal" data just because the string contains it).
 */

/** Lowercase, alphanumeric-only — for comparing names that differ only in spacing/punctuation. */
function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// carCatalog brand id → canonical LaborPrice.brand. Brands not in this map (Toyota,
// Honda) have no LaborPrice data yet — intentionally omitted, not a bug.
const BRAND_ID_MAP: Record<string, string> = {
  isuzu: "Isuzu", nissan: "Nissan", mazda: "Mazda", mitsubishi: "Mitsubishi",
  ford: "Ford", mg: "MG", byd: "BYD", suzuki: "Suzuki", hyundai: "Hyundai",
  subaru: "Subaru", mercedes: "Mercedes-Benz", bmw: "BMW", volvo: "Volvo", tesla: "Tesla",
};

// GWM/Haval is one carCatalog brand but two real LaborPrice brands — resolved per model id.
const GWM_MODEL_BRAND: Record<string, string> = {
  "haval-h6": "GWM", "haval-jolion": "GWM",
  "ora-good-cat": "ORA", "ora-07": "ORA", "tank-300": "ORA", "tank-500": "ORA",
};

/** Resolves the LaborPrice.brand to query for a given carCatalog brand+model id. */
export function resolveLaborBrand(brandId: string, modelId: string): string | null {
  if (brandId === "gwm") return GWM_MODEL_BRAND[modelId] ?? null;
  return BRAND_ID_MAP[brandId] ?? null;
}

// Explicit model aliases for brands whose naming convention differs structurally
// (word order, grouping scheme) — not just spacing/punctuation, which
// normalizeKey() already handles generically for everything else (e.g. carCatalog
// "Mazda 2" ↔ LaborPrice "Mazda2 Skyactiv", "A-Class (A200)" ↔ "A-Class").
const MODEL_ALIASES: Record<string, string[]> = {
  "bmw:1-series": ["Serie 1"],
  "bmw:3-series": ["Serie 3"],
  "bmw:5-series": ["Serie 5"],
  "bmw:7-series": ["Serie 7"],
  "volvo:xc40": ["40 Series"],
  "volvo:xc60": ["60 & 70 Series"],
  "volvo:s60": ["60 & 70 Series"],
  "volvo:xc90": ["80 & 90 Series"],
  "subaru:xv": ["XV/Crosstrek"],
};

function stripLeadingBrand(normModel: string, normBrand: string): string {
  return normBrand && normModel.startsWith(normBrand) ? normModel.slice(normBrand.length) : normModel;
}

/**
 * Finds the LaborPrice.model value matching a carCatalog brand+model, given the
 * distinct model names actually present in LaborPrice for that brand+laborBrand.
 * Returns null if nothing can be matched with confidence (no guessing).
 */
export function resolveLaborModel(
  brandId: string, modelId: string, modelName: string, laborBrand: string, availableModels: string[],
): string | null {
  const aliasKey = `${brandId}:${modelId}`;
  const aliasCandidates = MODEL_ALIASES[aliasKey];
  if (aliasCandidates) {
    for (const alias of aliasCandidates) {
      const hit = availableModels.find((m) => normalizeKey(m) === normalizeKey(alias));
      if (hit) return hit;
    }
  }

  const normBrand = normalizeKey(laborBrand);
  // LaborPrice model text sometimes redundantly repeats the brand (e.g. Ford
  // "Ford Ranger", Mazda "Mazda CX-3") — strip it from both sides before comparing
  // so "Ranger" (carCatalog) can still match "Ford Ranger" (LaborPrice).
  const wantedCore = stripLeadingBrand(normalizeKey(modelName), normBrand);
  // carCatalog sometimes suffixes a trim code in parens, e.g. "A-Class (A200)" —
  // strip only that trailing annotation (not a generic prefix check) so it can
  // still exact-match LaborPrice's plain "A-Class".
  const wantedCoreNoTrim = stripLeadingBrand(
    normalizeKey(modelName.replace(/\s*\([^)]*\)\s*$/, "")), normBrand,
  );

  let bestPrefixMatch: string | null = null;
  for (const m of availableModels) {
    const core = stripLeadingBrand(normalizeKey(m), normBrand);
    if (core === wantedCore || core === wantedCoreNoTrim) return m; // exact — safest
    // Available name may carry an extra trim/spec suffix (e.g. "Mazda2 Skyactiv",
    // "BT-50PRO"). Only accept when the AVAILABLE name is the longer one starting
    // with the wanted name — never the reverse, or a short real model like "Seal"
    // would falsely absorb an unrelated longer one like "Sealion 6".
    if (!bestPrefixMatch && wantedCore.length > 0 && core.startsWith(wantedCore)) {
      bestPrefixMatch = m;
    }
  }
  return bestPrefixMatch;
}
