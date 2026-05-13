import { type HealthProfile, RiskLevel } from "@disease-prediction/shared";
import { describe, expect, it } from "vitest";
import {
  type BriefingInputAppointment,
  type BriefingInputPrediction,
  buildPatientBriefing,
  RECENT_PREDICTION_LIMIT,
} from "./briefingProjection";

function appointment(overrides: Partial<BriefingInputAppointment> = {}): BriefingInputAppointment {
  const base: BriefingInputAppointment = {
    id: "appt_1",
    patientId: "user_patient_1",
    patientName: "Alice Johnson",
    slotStartTime: "2026-07-01T10:00:00.000Z",
    note: null,
  };
  return { ...base, ...overrides };
}

function profile(overrides: Partial<HealthProfile> = {}): HealthProfile {
  const base: HealthProfile = {
    age: 42,
    gender: "female",
    bloodType: "O+",
    conditions: ["asthma"],
    medications: ["albuterol"],
    allergies: ["penicillin"],
    editedFields: [],
  };
  return { ...base, ...overrides };
}

const emptyProfile: HealthProfile = {
  age: null,
  gender: null,
  bloodType: null,
  conditions: [],
  medications: [],
  allergies: [],
  editedFields: [],
};

function prediction(
  overrides: Partial<BriefingInputPrediction> & { id: string },
): BriefingInputPrediction {
  return {
    id: overrides.id,
    createdAt: overrides.createdAt ?? "2026-06-10T12:00:00.000Z",
    inputType: overrides.inputType ?? "symptom",
    riskLevel: overrides.riskLevel ?? RiskLevel.LOW,
    summary: overrides.summary ?? "Mild fatigue, likely transient.",
  };
}

describe("buildPatientBriefing — assembly", () => {
  it("assembles the appointment context, profile, and recent predictions into the wire shape", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ note: "Chest pain at night" }),
      profile: profile(),
      recentPredictions: [
        prediction({
          id: "p1",
          riskLevel: RiskLevel.HIGH,
          summary: "Possible cardiac event",
          createdAt: "2026-06-12T08:00:00.000Z",
        }),
      ],
    });

    expect(result.appointmentId).toBe("appt_1");
    expect(result.patientId).toBe("user_patient_1");
    expect(result.patientName).toBe("Alice Johnson");
    expect(result.slotStartTime).toBe("2026-07-01T10:00:00.000Z");
    expect(result.note).toBe("Chest pain at night");
    expect(result.profile.age).toBe(42);
    expect(result.profile.conditions).toEqual(["asthma"]);
    expect(result.recentPredictions).toEqual([
      {
        id: "p1",
        createdAt: "2026-06-12T08:00:00.000Z",
        inputType: "symptom",
        riskLevel: RiskLevel.HIGH,
        summary: "Possible cardiac event",
      },
    ]);
  });

  it("preserves the appointment note verbatim and exposes null when absent", () => {
    const withNote = buildPatientBriefing({
      appointment: appointment({ note: "Recurring migraines." }),
      profile: profile(),
      recentPredictions: [],
    });
    expect(withNote.note).toBe("Recurring migraines.");

    const noNote = buildPatientBriefing({
      appointment: appointment({ note: null }),
      profile: profile(),
      recentPredictions: [],
    });
    expect(noNote.note).toBeNull();
  });
});

describe("buildPatientBriefing — recent-5 limit and ordering", () => {
  it(`caps recent predictions at ${RECENT_PREDICTION_LIMIT} even if the caller passes more`, () => {
    const seven: BriefingInputPrediction[] = Array.from({ length: 7 }, (_, i) =>
      prediction({
        id: `p${i}`,
        createdAt: new Date(2026, 0, 7 - i).toISOString(),
      }),
    );
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: seven,
    });
    expect(result.recentPredictions).toHaveLength(RECENT_PREDICTION_LIMIT);
  });

  it("orders recent predictions newest first by createdAt, regardless of input order", () => {
    const mixed = [
      prediction({ id: "mid", createdAt: "2026-06-05T00:00:00.000Z" }),
      prediction({ id: "oldest", createdAt: "2026-05-01T00:00:00.000Z" }),
      prediction({ id: "newest", createdAt: "2026-06-12T00:00:00.000Z" }),
    ];
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: mixed,
    });
    expect(result.recentPredictions.map((p) => p.id)).toEqual(["newest", "mid", "oldest"]);
  });

  it("keeps the 5 newest after sorting + truncation", () => {
    const items: BriefingInputPrediction[] = [
      prediction({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" }),
      prediction({ id: "b", createdAt: "2026-02-01T00:00:00.000Z" }),
      prediction({ id: "c", createdAt: "2026-03-01T00:00:00.000Z" }),
      prediction({ id: "d", createdAt: "2026-04-01T00:00:00.000Z" }),
      prediction({ id: "e", createdAt: "2026-05-01T00:00:00.000Z" }),
      prediction({ id: "f", createdAt: "2026-06-01T00:00:00.000Z" }),
    ];
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: items,
    });
    expect(result.recentPredictions.map((p) => p.id)).toEqual(["f", "e", "d", "c", "b"]);
  });
});

describe("buildPatientBriefing — empty / graceful cases", () => {
  it("uses an empty profile when the caller passes null", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: null,
      recentPredictions: [],
    });
    expect(result.profile).toEqual(emptyProfile);
  });

  it("returns an empty recentPredictions array when none are provided", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: [],
    });
    expect(result.recentPredictions).toEqual([]);
  });

  it("still produces a summary string when both profile and predictions are empty", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ patientName: null, note: null }),
      profile: null,
      recentPredictions: [],
    });
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });
});

describe("buildPatientBriefing — templated narrative summary", () => {
  it("names the patient and folds in age, gender, and blood type when known", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ patientName: "Alice Johnson" }),
      profile: profile({ age: 42, gender: "female", bloodType: "O+" }),
      recentPredictions: [],
    });
    expect(result.summary).toContain("Alice Johnson");
    expect(result.summary).toContain("42");
    expect(result.summary).toContain("female");
    expect(result.summary).toContain("O+");
  });

  it("falls back to 'The patient' when patientName is null", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ patientName: null }),
      profile: profile(),
      recentPredictions: [],
    });
    expect(result.summary).toContain("The patient");
  });

  it("skips identity pieces that are not on file (no age, no gender, no blood type)", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ patientName: "Bob" }),
      profile: profile({ age: null, gender: null, bloodType: null }),
      recentPredictions: [],
    });
    expect(result.summary).toContain("Bob");
    expect(result.summary).not.toContain("year-old");
    expect(result.summary).not.toContain("blood type");
  });

  it("counts conditions, medications, and allergies in the standing-facts sentence", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile({
        conditions: ["asthma", "hypertension"],
        medications: ["albuterol"],
        allergies: [],
      }),
      recentPredictions: [],
    });
    expect(result.summary).toContain("2 chronic condition");
    expect(result.summary).toContain("1 medication");
    expect(result.summary).toContain("0 allergies");
  });

  it("uses the no-standing-facts phrasing when the profile has no health facts at all", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: emptyProfile,
      recentPredictions: [],
    });
    expect(result.summary).toContain("No standing health facts on file");
  });

  it("reports the count of recent predictions and the highest risk level seen", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: [
        prediction({ id: "p1", riskLevel: RiskLevel.LOW }),
        prediction({ id: "p2", riskLevel: RiskLevel.HIGH }),
        prediction({ id: "p3", riskLevel: RiskLevel.MODERATE }),
      ],
    });
    expect(result.summary).toContain("3 prediction");
    expect(result.summary.toUpperCase()).toContain("HIGH");
  });

  it("uses the no-predictions phrasing when there are no recent predictions", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: [],
    });
    expect(result.summary).toContain("No recent predictions on file");
  });

  it("quotes the appointment note when one is supplied", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ note: "Sharp chest pain after meals" }),
      profile: profile(),
      recentPredictions: [],
    });
    expect(result.summary).toContain("Sharp chest pain after meals");
  });

  it("uses the no-note phrasing when there is no booking note", () => {
    const result = buildPatientBriefing({
      appointment: appointment({ note: null }),
      profile: profile(),
      recentPredictions: [],
    });
    expect(result.summary).toContain("No note supplied");
  });

  it("treats CRITICAL as worse than HIGH when picking the highest recent risk", () => {
    const result = buildPatientBriefing({
      appointment: appointment(),
      profile: profile(),
      recentPredictions: [
        prediction({ id: "p1", riskLevel: RiskLevel.HIGH }),
        prediction({ id: "p2", riskLevel: RiskLevel.CRITICAL }),
        prediction({ id: "p3", riskLevel: RiskLevel.LOW }),
      ],
    });
    expect(result.summary.toUpperCase()).toContain("CRITICAL");
  });
});
