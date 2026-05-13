import type { HealthProfile } from "./healthProfile";
import type { RiskLevel } from "./types";

/**
 * One prediction row as it appears in the patient-context briefing — the
 * briefing is a read-time projection, so it only carries the small set of
 * fields the doctor actually scans on the dashboard card. The full
 * `Prediction` JSON stays in the API; the projection trims it to a stable
 * UI-shaped row so the client doesn't have to know about `inputPayload`
 * shape variations.
 */
export interface BriefingPrediction {
  id: string;
  createdAt: string;
  inputType: string;
  riskLevel: RiskLevel;
  summary: string;
}

/**
 * Patient-context briefing — the dashboard centerpiece. A pure read-time
 * projection of the *currently booked* patient's standing health facts,
 * their five most recent predictions, and the appointment note, plus a
 * short templated narrative summary the doctor reads at a glance.
 *
 * Never stored: computed fresh on every fetch so it always reflects the
 * patient's latest profile. No Gemini call — `summary` is templated from
 * the structured fields. If a patient has no `HealthProfile` row yet,
 * `profile` is the zeroed default (every field null / []), and the
 * narrative summary still degrades gracefully.
 */
export interface PatientBriefing {
  appointmentId: string;
  patientId: string;
  patientName: string | null;
  slotStartTime: string;
  note: string | null;
  profile: HealthProfile;
  recentPredictions: BriefingPrediction[];
  /** Templated narrative string. No Gemini call — assembled from `profile` + `recentPredictions` + `note`. */
  summary: string;
}
