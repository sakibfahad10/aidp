import { z } from "zod";

/**
 * Field names of the patient-editable HealthProfile. Names match the
 * `HealthProfile` model columns exactly; the same strings are what land in
 * `editedFields` to mark a field as patient-touched so future auto-fills
 * from a structured prediction skip it.
 */
export const HEALTH_PROFILE_FIELDS = [
  "age",
  "gender",
  "bloodType",
  "conditions",
  "medications",
  "allergies",
] as const;

export type HealthProfileField = (typeof HEALTH_PROFILE_FIELDS)[number];

export const healthProfileFieldSchema = z.enum(HEALTH_PROFILE_FIELDS);

/** A patient's full HealthProfile as returned by GET /api/v1/health-profile. */
export interface HealthProfile {
  age: number | null;
  gender: string | null;
  bloodType: string | null;
  conditions: string[];
  medications: string[];
  allergies: string[];
  editedFields: HealthProfileField[];
}

/**
 * Body of PATCH /api/v1/health-profile — every key the patient touched in the
 * `/profile` editor is included so the API can both write the new value and
 * add the field name to `editedFields`. Scalars accept `null` to clear them.
 */
export const updateHealthProfileRequestSchema = z
  .object({
    age: z.number().int().min(0).max(150).nullable().optional(),
    gender: z.string().min(1).max(64).nullable().optional(),
    bloodType: z.string().min(1).max(16).nullable().optional(),
    conditions: z.array(z.string().min(1).max(200)).max(200).optional(),
    medications: z.array(z.string().min(1).max(200)).max(200).optional(),
    allergies: z.array(z.string().min(1).max(200)).max(200).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateHealthProfileRequest = z.infer<typeof updateHealthProfileRequestSchema>;
