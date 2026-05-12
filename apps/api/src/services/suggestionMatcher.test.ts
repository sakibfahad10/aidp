import { type DoctorSuggestion, FALLBACK_SPECIALTY, Specialty } from "@disease-prediction/shared";
import { describe, expect, it } from "vitest";
import { type SuggestionCandidate, suggestDoctors } from "./suggestionMatcher";

function candidate(overrides: Partial<SuggestionCandidate> & { id: string }): SuggestionCandidate {
  return {
    id: overrides.id,
    userId: overrides.userId ?? `u_${overrides.id}`,
    name: overrides.name ?? `Dr. ${overrides.id}`,
    specialties: overrides.specialties ?? [],
    affiliation: overrides.affiliation ?? null,
    city: overrides.city ?? null,
    experienceYears: overrides.experienceYears ?? null,
    feeBdt: overrides.feeBdt ?? null,
    hasOpenSlot: overrides.hasOpenSlot ?? false,
  };
}

function ids(rows: DoctorSuggestion[]): string[] {
  return rows.map((r) => r.id);
}

describe("suggestDoctors — overlap", () => {
  it("filters out doctors who share no specialty with the prediction", () => {
    const matched = candidate({ id: "match", specialties: [Specialty.Cardiology] });
    const unrelated = candidate({ id: "skip", specialties: [Specialty.Dermatology] });
    const result = suggestDoctors([Specialty.Cardiology], [matched, unrelated]);
    expect(ids(result)).toEqual(["match"]);
  });

  it("includes a doctor whose specialties overlap on even a single value", () => {
    const partial = candidate({
      id: "partial",
      specialties: [Specialty.Cardiology, Specialty.Endocrinology],
    });
    const result = suggestDoctors([Specialty.Endocrinology], [partial]);
    expect(ids(result)).toEqual(["partial"]);
  });

  it("orders doctors by the size of the specialty overlap (more matches first)", () => {
    const two = candidate({
      id: "two",
      specialties: [Specialty.Cardiology, Specialty.Endocrinology],
      feeBdt: 5000,
      hasOpenSlot: true,
    });
    const one = candidate({
      id: "one",
      specialties: [Specialty.Cardiology],
      feeBdt: 100,
      hasOpenSlot: true,
    });
    const result = suggestDoctors([Specialty.Cardiology, Specialty.Endocrinology], [one, two]);
    expect(ids(result)).toEqual(["two", "one"]);
  });
});

describe("suggestDoctors — ordering (overlap → has-open-slot → fee asc)", () => {
  it("breaks an overlap tie by placing has-open-slot first", () => {
    const noSlots = candidate({
      id: "no",
      specialties: [Specialty.Cardiology],
      feeBdt: 100,
      hasOpenSlot: false,
    });
    const bookable = candidate({
      id: "yes",
      specialties: [Specialty.Cardiology],
      feeBdt: 5000,
      hasOpenSlot: true,
    });
    const result = suggestDoctors([Specialty.Cardiology], [noSlots, bookable]);
    expect(ids(result)).toEqual(["yes", "no"]);
  });

  it("breaks an overlap+has-open-slot tie by fee ascending", () => {
    const cheap = candidate({
      id: "cheap",
      specialties: [Specialty.Cardiology],
      feeBdt: 200,
      hasOpenSlot: true,
    });
    const expensive = candidate({
      id: "expensive",
      specialties: [Specialty.Cardiology],
      feeBdt: 9000,
      hasOpenSlot: true,
    });
    const mid = candidate({
      id: "mid",
      specialties: [Specialty.Cardiology],
      feeBdt: 1500,
      hasOpenSlot: true,
    });
    const result = suggestDoctors([Specialty.Cardiology], [expensive, cheap, mid]);
    expect(ids(result)).toEqual(["cheap", "mid", "expensive"]);
  });

  it("treats a null fee as +infinity (sinks within its bucket)", () => {
    const nullFee = candidate({
      id: "null",
      specialties: [Specialty.Cardiology],
      feeBdt: null,
      hasOpenSlot: true,
    });
    const cheap = candidate({
      id: "cheap",
      specialties: [Specialty.Cardiology],
      feeBdt: 100,
      hasOpenSlot: true,
    });
    const result = suggestDoctors([Specialty.Cardiology], [nullFee, cheap]);
    expect(ids(result)).toEqual(["cheap", "null"]);
  });
});

describe("suggestDoctors — GeneralMedicine fallback", () => {
  it("falls back to GeneralMedicine when recommendedSpecialties is empty", () => {
    const general = candidate({
      id: "general",
      specialties: [Specialty.GeneralMedicine],
      hasOpenSlot: true,
    });
    const other = candidate({ id: "other", specialties: [Specialty.Cardiology] });
    const result = suggestDoctors([], [general, other]);
    expect(ids(result)).toEqual(["general"]);
    expect(result[0]?.matchedSpecialties).toEqual([FALLBACK_SPECIALTY]);
  });

  it("falls back to GeneralMedicine when no candidate matches any recommended specialty", () => {
    const general = candidate({
      id: "general",
      specialties: [Specialty.GeneralMedicine],
    });
    const otherSpecialist = candidate({
      id: "other",
      specialties: [Specialty.Pediatrics],
    });
    const result = suggestDoctors([Specialty.Cardiology], [general, otherSpecialist]);
    expect(ids(result)).toEqual(["general"]);
  });

  it("returns an empty list when fallback is needed but no GeneralMedicine doctor exists", () => {
    const cardio = candidate({ id: "cardio", specialties: [Specialty.Cardiology] });
    const result = suggestDoctors([], [cardio]);
    expect(result).toEqual([]);
  });

  it("does NOT fall back when at least one candidate matches the recommendation", () => {
    const matched = candidate({ id: "matched", specialties: [Specialty.Cardiology] });
    const general = candidate({ id: "general", specialties: [Specialty.GeneralMedicine] });
    const result = suggestDoctors([Specialty.Cardiology], [matched, general]);
    expect(ids(result)).toEqual(["matched"]);
  });
});

describe("suggestDoctors — annotation", () => {
  it("annotates each suggestion with the specialties that drove the match", () => {
    const doc = candidate({
      id: "doc",
      specialties: [Specialty.Cardiology, Specialty.Pediatrics],
    });
    const [first] = suggestDoctors([Specialty.Cardiology, Specialty.Neurology], [doc]);
    expect(first?.matchedSpecialties).toEqual([Specialty.Cardiology]);
  });

  it("preserves the original candidate fields on each suggestion", () => {
    const doc = candidate({
      id: "doc",
      userId: "u1",
      name: "Dr. Alice",
      specialties: [Specialty.Cardiology],
      affiliation: "Square",
      feeBdt: 1200,
      hasOpenSlot: true,
    });
    const [first] = suggestDoctors([Specialty.Cardiology], [doc]);
    expect(first).toMatchObject({
      id: "doc",
      userId: "u1",
      name: "Dr. Alice",
      affiliation: "Square",
      feeBdt: 1200,
      hasOpenSlot: true,
    });
  });
});
