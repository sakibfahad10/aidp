import type {
  BriefingPrediction,
  HealthProfile,
  PatientBriefing,
} from "@disease-prediction/shared";
import { RiskLevel } from "@disease-prediction/shared";

/**
 * Hard cap on the number of recent predictions surfaced in the briefing.
 * Acceptance criteria from issue #18: "5 most recent." The service layer
 * already passes at most 5 (it queries with `limit: 5`); the projection
 * caps again defensively so the rule lives in one place.
 */
export const RECENT_PREDICTION_LIMIT = 5;

/**
 * Empty `HealthProfile` substituted when the booked patient has no
 * `HealthProfile` row yet. Same shape as `emptyHealthProfile()` in the
 * repository, kept local so the projection has no dependency on the
 * repository module.
 */
const EMPTY_HEALTH_PROFILE: HealthProfile = {
  age: null,
  gender: null,
  bloodType: null,
  conditions: [],
  medications: [],
  allergies: [],
  editedFields: [],
};

/** Appointment context the projection needs — already shaped, never a Prisma row. */
export interface BriefingInputAppointment {
  id: string;
  patientId: string;
  patientName: string | null;
  slotStartTime: string;
  note: string | null;
}

/** Prediction row in projection-input shape (createdAt as ISO so the projection stays string-only). */
export interface BriefingInputPrediction {
  id: string;
  createdAt: string;
  inputType: string;
  riskLevel: RiskLevel;
  summary: string;
}

export interface BriefingInput {
  appointment: BriefingInputAppointment;
  profile: HealthProfile | null;
  recentPredictions: BriefingInputPrediction[];
}

/**
 * Pure read-time projection of the patient-context briefing. No I/O, no
 * Gemini call, no stored entity — the caller assembles the inputs (the
 * actual booked patient's `HealthProfile`, their five most recent
 * `Prediction`s, the appointment note) and this function shapes the wire
 * response plus a short templated narrative summary.
 *
 * The projection is computed fresh on every request so the briefing
 * always reflects the patient's latest profile and prediction history.
 */
export function buildPatientBriefing(input: BriefingInput): PatientBriefing {
  const { appointment, recentPredictions } = input;
  const profile = input.profile ?? EMPTY_HEALTH_PROFILE;

  const sorted = [...recentPredictions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_PREDICTION_LIMIT)
    .map(toBriefingPrediction);

  return {
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    slotStartTime: appointment.slotStartTime,
    note: appointment.note,
    profile,
    recentPredictions: sorted,
    summary: buildNarrativeSummary(appointment, profile, sorted),
  };
}

function toBriefingPrediction(p: BriefingInputPrediction): BriefingPrediction {
  return {
    id: p.id,
    createdAt: p.createdAt,
    inputType: p.inputType,
    riskLevel: p.riskLevel,
    summary: p.summary,
  };
}

/**
 * Templated narrative the doctor reads at a glance. Four sentences, each
 * gracefully degrading when the relevant piece of data is absent so the
 * paragraph reads cleanly for a fully-populated patient and an empty one
 * alike.
 */
function buildNarrativeSummary(
  appointment: BriefingInputAppointment,
  profile: HealthProfile,
  recent: BriefingPrediction[],
): string {
  return [
    identitySentence(appointment.patientName, profile),
    standingFactsSentence(profile),
    recentRiskSentence(recent),
    noteSentence(appointment.note),
  ].join(" ");
}

function identitySentence(patientName: string | null, profile: HealthProfile): string {
  const name = patientName ?? "The patient";
  const descriptors: string[] = [];
  if (profile.age !== null && profile.gender) {
    descriptors.push(`is a ${profile.age}-year-old ${profile.gender}`);
  } else if (profile.age !== null) {
    descriptors.push(`is ${profile.age} years old`);
  } else if (profile.gender) {
    descriptors.push(`is ${profile.gender}`);
  }
  const base = descriptors.length > 0 ? `${name} ${descriptors.join(", ")}` : name;
  const sentence = profile.bloodType ? `${base} (blood type ${profile.bloodType})` : base;
  return `${sentence}.`;
}

function standingFactsSentence(profile: HealthProfile): string {
  const totals = profile.conditions.length + profile.medications.length + profile.allergies.length;
  if (totals === 0) {
    return "No standing health facts on file.";
  }
  const conditions = pluralize(
    profile.conditions.length,
    "chronic condition",
    "chronic conditions",
  );
  const medications = pluralize(profile.medications.length, "medication", "medications");
  const allergies = pluralize(profile.allergies.length, "allergy", "allergies");
  return `Standing facts: ${conditions}, ${medications}, ${allergies}.`;
}

function recentRiskSentence(recent: BriefingPrediction[]): string {
  if (recent.length === 0) {
    return "No recent predictions on file.";
  }
  const peak = highestRisk(recent);
  const label = pluralize(recent.length, "prediction", "predictions");
  return `Recent risk profile: ${label} on file; highest recent risk is ${peak.toUpperCase()}.`;
}

function noteSentence(note: string | null): string {
  if (!note) return "No note supplied.";
  return `Reason for visit: "${note}".`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const RISK_RANK: Record<RiskLevel, number> = {
  [RiskLevel.LOW]: 0,
  [RiskLevel.MODERATE]: 1,
  [RiskLevel.HIGH]: 2,
  [RiskLevel.CRITICAL]: 3,
};

function highestRisk(predictions: BriefingPrediction[]): RiskLevel {
  let peak: RiskLevel = RiskLevel.LOW;
  for (const p of predictions) {
    if (RISK_RANK[p.riskLevel] > RISK_RANK[peak]) peak = p.riskLevel;
  }
  return peak;
}
