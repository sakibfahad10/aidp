import { z } from "zod";
import { Specialty } from "./doctor";
import { InputType, RiskLevel } from "./types";

/** Schema for symptom-based input */
export const symptomPayloadSchema = z.object({
  symptoms: z
    .string()
    .min(10, "Please describe your symptoms in at least 10 characters")
    .max(2000, "Symptom description is too long"),
  duration: z.string().optional(),
  severity: z.string().optional(),
});

/** Schema for structured health data input */
export const structuredPayloadSchema = z.object({
  age: z.number().min(0).max(150, "Please enter a valid age"),
  gender: z.string().min(1, "Gender is required"),
  symptoms: z.array(z.string()).min(1, "Please select at least one symptom"),
  medicalHistory: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  vitals: z
    .object({
      bloodPressure: z.string().optional(),
      heartRate: z.number().min(20).max(300).optional(),
      temperature: z.number().min(30).max(45).optional(),
      weight: z.number().min(1).max(500).optional(),
      height: z.number().min(30).max(300).optional(),
    })
    .optional(),
});

/** Schema for medical report text input */
export const reportPayloadSchema = z.object({
  reportText: z
    .string()
    .min(20, "Report text must be at least 20 characters")
    .max(10000, "Report text is too long"),
  reportType: z.string().optional(),
});

/** Unified prediction request schema */
export const predictRequestSchema = z.discriminatedUnion("inputType", [
  z.object({
    inputType: z.literal(InputType.SYMPTOM),
    payload: symptomPayloadSchema,
  }),
  z.object({
    inputType: z.literal(InputType.STRUCTURED),
    payload: structuredPayloadSchema,
  }),
  z.object({
    inputType: z.literal(InputType.REPORT),
    payload: reportPayloadSchema,
  }),
]);

/**
 * Tolerant decoder for `recommendedSpecialties` (per ADR 0003): missing →
 * `[]`, non-array → `[]`, and unknown values inside an array are silently
 * dropped instead of failing the whole prediction parse. This way legacy
 * `Prediction` rows without the field and imperfect model output never break
 * `parseAiResponse`.
 */
const recommendedSpecialtiesField = z
  .unknown()
  .optional()
  .transform((value) => {
    if (!Array.isArray(value)) return [] as Specialty[];
    const allowed = Object.values(Specialty) as string[];
    return value.filter(
      (entry): entry is Specialty => typeof entry === "string" && allowed.includes(entry),
    );
  });

/** Schema for the AI prediction response */
export const aiPredictionResponseSchema = z.object({
  riskLevel: z.nativeEnum(RiskLevel),
  possibleConditions: z.array(
    z.object({
      name: z.string(),
      probability: z.string(),
      description: z.string(),
    }),
  ),
  summary: z.string(),
  recommendation: z.string(),
  redFlags: z.array(z.string()),
  recommendedSpecialties: recommendedSpecialtiesField,
});

export type PredictRequestInput = z.infer<typeof predictRequestSchema>;
