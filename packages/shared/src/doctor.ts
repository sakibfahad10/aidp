import { z } from "zod";

/**
 * Controlled vocabulary of medical specialties — single source of truth for
 * the AI ↔ doctor join key (see ADR 0003). `GeneralMedicine` is the
 * required-to-exist fallback when nothing else matches.
 *
 * String values mirror the Prisma enum exactly so values flow across the
 * boundary without remapping.
 */
export enum Specialty {
  GeneralMedicine = "GeneralMedicine",
  Cardiology = "Cardiology",
  Endocrinology = "Endocrinology",
  Dermatology = "Dermatology",
  Gastroenterology = "Gastroenterology",
  Neurology = "Neurology",
  Pulmonology = "Pulmonology",
  Nephrology = "Nephrology",
  Orthopedics = "Orthopedics",
  Rheumatology = "Rheumatology",
  Pediatrics = "Pediatrics",
  Psychiatry = "Psychiatry",
  Gynecology = "Gynecology",
  ENT = "ENT",
  Ophthalmology = "Ophthalmology",
  Urology = "Urology",
  InfectiousDisease = "InfectiousDisease",
  GeneralSurgery = "GeneralSurgery",
}

/** Fallback specialty used when a prediction maps to nothing else. */
export const FALLBACK_SPECIALTY: Specialty = Specialty.GeneralMedicine;

export const specialtySchema = z.nativeEnum(Specialty);

/** Small fixed list of cities — the location filter; no geocoding. */
export enum City {
  Dhaka = "Dhaka",
  Chattogram = "Chattogram",
  Sylhet = "Sylhet",
  Rajshahi = "Rajshahi",
  Khulna = "Khulna",
  Barishal = "Barishal",
  Rangpur = "Rangpur",
  Mymensingh = "Mymensingh",
}

export const citySchema = z.nativeEnum(City);

/**
 * Lifecycle status of a `DoctorProfile`.
 *
 * MVP transitions: `draft → verified` directly on submit. `pending` is
 * reserved for a future admin-review step and is currently unused — kept
 * here so the persisted enum doesn't need a migration when that lands.
 */
export enum DoctorStatus {
  DRAFT = "draft",
  PENDING = "pending",
  VERIFIED = "verified",
}

export const doctorStatusSchema = z.nativeEnum(DoctorStatus);

/**
 * BMDC registration-number rule. Optional `A` (MBBS) or `B` (BDS) prefix, an
 * optional dash, then 3–7 digits. Real-world-shaped: BMDC publishes no strict
 * spec, so the rule is intentionally lenient. Always uppercase-normalized.
 */
const BMDC_PATTERN = /^[AB]?-?\d{3,7}$/;

/** Trim and uppercase a BMDC candidate. Used by the validator and the schema. */
export function normalizeBmdcNumber(value: string): string {
  return value.trim().toUpperCase();
}

/** Pure predicate: is this string a valid BMDC number after normalization? */
export function isValidBmdcNumber(value: string): boolean {
  return BMDC_PATTERN.test(normalizeBmdcNumber(value));
}

/**
 * Zod schema for BMDC numbers — parses into the uppercase-normalized form so
 * downstream code never sees the raw user-entered casing.
 */
export const bmdcNumberSchema = z
  .string()
  .transform(normalizeBmdcNumber)
  .refine((v) => BMDC_PATTERN.test(v), {
    message: "BMDC number must be 3–7 digits, optionally prefixed by A or B (e.g. A-12345, 12345)",
  });

const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long");

const qualificationsSchema = z
  .string()
  .min(2, "Qualifications are required")
  .max(500, "Qualifications are too long");

const affiliationSchema = z
  .string()
  .min(2, "Affiliation is required")
  .max(200, "Affiliation is too long");

const experienceYearsSchema = z
  .number()
  .int("Experience must be a whole number of years")
  .min(0, "Experience cannot be negative")
  .max(80, "Experience seems too high");

const feeBdtSchema = z
  .number()
  .int("Fee must be a whole number of taka")
  .min(0, "Fee cannot be negative")
  .max(1_000_000, "Fee seems too high");

const specialtiesSchema = z.array(specialtySchema).min(1, "Pick at least one specialty");

/**
 * Schema for a doctor's resumable onboarding draft — every field optional so a
 * half-filled wizard can persist progress. The fields that are present are
 * still validated/normalized (e.g. BMDC is uppercase-normalized) so a draft
 * can't drift into invalid state mid-wizard.
 */
export const doctorOnboardingDraftSchema = z.object({
  phone: phoneSchema.optional(),
  publicEmail: z.string().email("Enter a valid email").optional(),
  bmdcNumber: bmdcNumberSchema.optional(),
  qualifications: qualificationsSchema.optional(),
  specialties: z.array(specialtySchema).optional(),
  affiliation: affiliationSchema.optional(),
  city: citySchema.optional(),
  experienceYears: experienceYearsSchema.optional(),
  feeBdt: feeBdtSchema.optional(),
});

export type DoctorOnboardingDraft = z.infer<typeof doctorOnboardingDraftSchema>;

/**
 * Schema for the final onboarding submission — every field required. Submitting
 * a profile that passes this transitions `status: draft → verified` (no review
 * step in the MVP).
 */
export const doctorOnboardingSubmitSchema = z.object({
  phone: phoneSchema,
  publicEmail: z.string().email("Enter a valid email"),
  bmdcNumber: bmdcNumberSchema,
  qualifications: qualificationsSchema,
  specialties: specialtiesSchema,
  affiliation: affiliationSchema,
  city: citySchema,
  experienceYears: experienceYearsSchema,
  feeBdt: feeBdtSchema,
});

export type DoctorOnboardingSubmit = z.infer<typeof doctorOnboardingSubmitSchema>;

/**
 * Shape returned by GET /api/v1/doctors/me — the wizard reads this on mount
 * to resume an in-progress draft and to know whether the user has already
 * finished onboarding.
 */
export interface DoctorProfileResponse {
  id: string;
  userId: string;
  phone: string | null;
  publicEmail: string | null;
  bmdcNumber: string | null;
  qualifications: string | null;
  specialties: Specialty[];
  affiliation: string | null;
  city: City | null;
  experienceYears: number | null;
  feeBdt: number | null;
  status: DoctorStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query for the public verified-doctor directory. Every field optional —
 * an empty query lists every verified doctor (has-open-slot DESC, fee ASC).
 * `specialty` / `city` are validated against the controlled vocabularies;
 * `affiliation` is a free-text contains-match.
 */
export const directoryQuerySchema = z.object({
  specialty: specialtySchema.optional(),
  city: citySchema.optional(),
  affiliation: z.string().trim().min(1).max(200).optional(),
});

export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

/**
 * One row of the public doctor directory. `name` is the doctor's `User.name`
 * (may be null if the user hasn't set one); `userId` is intentionally
 * present so the row can link to the public profile page.
 *
 * Only verified doctors appear here — no login email, no draft fields, no
 * BMDC number. Just what a patient needs to decide whether to look closer.
 */
export interface DirectoryDoctor {
  id: string;
  userId: string;
  name: string | null;
  specialties: Specialty[];
  affiliation: string | null;
  city: City | null;
  experienceYears: number | null;
  feeBdt: number | null;
}

/**
 * The public profile of a verified doctor. Returned by
 * GET /api/v1/doctors/:id. Includes everything `DirectoryDoctor` carries
 * plus the qualifications string, the doctor's public contact email (NOT
 * the login email), and the currently open availability slots so the
 * detail page can render bookability.
 */
export interface PublicDoctorProfile extends DirectoryDoctor {
  qualifications: string | null;
  publicEmail: string | null;
  openSlots: { id: string; startTime: string }[];
}
