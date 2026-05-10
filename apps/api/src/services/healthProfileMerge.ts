import type { HealthProfileField, StructuredPayload } from "@disease-prediction/shared";

/**
 * Shape consumed by the pure merge: a HealthProfile reduced to the fields the
 * merge cares about. Decoupled from the Prisma row so this stays unit-testable
 * without a database.
 */
export interface HealthProfileMergeInput {
  age: number | null;
  gender: string | null;
  bloodType: string | null;
  conditions: string[];
  medications: string[];
  allergies: string[];
  editedFields: HealthProfileField[];
}

export type HealthProfileMergeResult = HealthProfileMergeInput;

function unionDedup(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((v) => v.trim().toLowerCase()));
  const out = [...existing];
  for (const candidate of incoming) {
    const key = candidate.trim().toLowerCase();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate.trim());
  }
  return out;
}

/**
 * Edited-field-aware, non-destructive merge from a `structured` prediction
 * payload onto a patient's HealthProfile.
 *
 * Rules (per the HealthProfile section of CONTEXT.md):
 * - Scalars (`age`, `gender`) fill **only** if empty AND not in `editedFields`.
 * - Arrays (`conditions`, `medications`) union (dedup, case- and
 *   whitespace-insensitive) unless the field is in `editedFields`.
 * - Field mapping: `age → age`, `medicalHistory → conditions`,
 *   `currentMedications → medications`.
 * - `symptoms` and `vitals` are transient — never written to the profile.
 * - `bloodType` and `allergies` have no prediction source and are left alone.
 */
export function mergeStructuredIntoHealthProfile(
  profile: HealthProfileMergeInput,
  payload: StructuredPayload,
): HealthProfileMergeResult {
  const edited = new Set<HealthProfileField>(profile.editedFields);
  const result: HealthProfileMergeResult = {
    age: profile.age,
    gender: profile.gender,
    bloodType: profile.bloodType,
    conditions: [...profile.conditions],
    medications: [...profile.medications],
    allergies: [...profile.allergies],
    editedFields: [...profile.editedFields],
  };

  if (!edited.has("age") && result.age === null && typeof payload.age === "number") {
    result.age = payload.age;
  }
  if (!edited.has("gender") && result.gender === null && payload.gender) {
    result.gender = payload.gender;
  }

  if (!edited.has("conditions") && payload.medicalHistory?.length) {
    result.conditions = unionDedup(result.conditions, payload.medicalHistory);
  }
  if (!edited.has("medications") && payload.currentMedications?.length) {
    result.medications = unionDedup(result.medications, payload.currentMedications);
  }

  return result;
}
