import {
  type DoctorSuggestion,
  FALLBACK_SPECIALTY,
  type Specialty,
} from "@disease-prediction/shared";

/**
 * One candidate doctor passed to the matcher. The caller is responsible for
 * restricting candidates to **verified** doctors — the matcher does not
 * re-check status. `hasOpenSlot` is a precomputed boolean so the matcher can
 * stay pure (no DB access) and small.
 *
 * Shape-compatible with `DoctorSuggestion` minus the `matchedSpecialties`
 * field the matcher itself adds.
 */
export type SuggestionCandidate = Omit<DoctorSuggestion, "matchedSpecialties">;

/**
 * A matched candidate plus the subset of specialties that drove the match —
 * useful for rendering "Recommended because: Cardiology" on the result card,
 * and for the deep-link target (one link per matched specialty).
 */
export type SuggestionRow = DoctorSuggestion;

/**
 * Rank verified candidate doctors against a prediction's
 * `recommendedSpecialties`. Pure & unit-tested.
 *
 * Order (per ADR 0003 / PRD #9):
 *   1. overlap size (more matched specialties first)
 *   2. has-open-slot (bookable first)
 *   3. fee ascending (`null` sinks to the bottom of its bucket)
 *
 * Fallback: if `recommendedSpecialties` is empty, OR if no candidate matches
 * any of them, the matcher transparently re-runs against
 * `[GeneralMedicine]`. If still nothing matches, the result is an empty
 * list — the result card simply hides the section.
 *
 * The caller filters to verified doctors. Non-verified rows passed in are
 * ranked normally (the matcher trusts its inputs).
 */
export function suggestDoctors(
  recommendedSpecialties: Specialty[],
  candidates: SuggestionCandidate[],
): SuggestionRow[] {
  const matched = matchAgainst(recommendedSpecialties, candidates);
  if (matched.length > 0) return matched.sort(compareSuggestion);
  if (recommendedSpecialties.length === 1 && recommendedSpecialties[0] === FALLBACK_SPECIALTY) {
    // Already tried the fallback — nothing else to do.
    return [];
  }
  return matchAgainst([FALLBACK_SPECIALTY], candidates).sort(compareSuggestion);
}

function matchAgainst(wanted: Specialty[], candidates: SuggestionCandidate[]): SuggestionRow[] {
  const wantedSet = new Set(wanted);
  if (wantedSet.size === 0) return [];
  const rows: SuggestionRow[] = [];
  for (const c of candidates) {
    const matchedSpecialties = c.specialties.filter((s) => wantedSet.has(s));
    if (matchedSpecialties.length === 0) continue;
    rows.push({ ...c, matchedSpecialties });
  }
  return rows;
}

function compareSuggestion(a: SuggestionRow, b: SuggestionRow): number {
  if (a.matchedSpecialties.length !== b.matchedSpecialties.length) {
    return b.matchedSpecialties.length - a.matchedSpecialties.length;
  }
  const aBookable = a.hasOpenSlot ? 1 : 0;
  const bBookable = b.hasOpenSlot ? 1 : 0;
  if (aBookable !== bBookable) return bBookable - aBookable;
  const aFee = a.feeBdt ?? Number.POSITIVE_INFINITY;
  const bFee = b.feeBdt ?? Number.POSITIVE_INFINITY;
  return aFee - bFee;
}
