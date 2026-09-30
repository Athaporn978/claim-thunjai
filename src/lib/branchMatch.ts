export type BranchLike = { id: string; code: string; name: string };

const norm = (s: string) =>
  s.toLowerCase().replace(/^\s*(?:สาขา|บริษัท)\s*/g, "").replace(/\s+/g, " ").trim();

/**
 * Resolves the branch a session belongs to. Exact name match wins; only then
 * do we fall back to a normalised comparison. The old "strip the parentheses
 * and use contains" approach turned "สาขากรุงเทพฯ (บางนา)" into
 * "สาขากรุงเทพฯ", which matched all five Bangkok branches and returned the
 * first — silently filing Bang Na's cases under Lat Phrao.
 */
export function pickBranch(branches: BranchLike[], sessionBranchName: string | null | undefined): BranchLike | null {
  const want = (sessionBranchName || "").trim();
  if (!want) return null;
  const exact = branches.find((b) => b.name.trim() === want);
  if (exact) return exact;
  const w = norm(want);
  if (!w) return null;
  return (
    branches.find((b) => norm(b.name) === w) ??
    branches.find((b) => norm(b.name).includes(w) || w.includes(norm(b.name))) ??
    null
  );
}
