import type { HealthProfile, StructuredPayload } from "@disease-prediction/shared";
import { describe, expect, it } from "vitest";
import { mergeStructuredIntoHealthProfile } from "./healthProfileMerge";

function emptyProfile(): HealthProfile {
  return {
    age: null,
    gender: null,
    bloodType: null,
    conditions: [],
    medications: [],
    allergies: [],
    editedFields: [],
  };
}

function structured(overrides: Partial<StructuredPayload> = {}): StructuredPayload {
  return {
    age: 42,
    gender: "male",
    symptoms: ["cough"],
    medicalHistory: ["hypertension"],
    currentMedications: ["aspirin"],
    vitals: { bloodPressure: "120/80", heartRate: 72 },
    ...overrides,
  };
}

describe("mergeStructuredIntoHealthProfile", () => {
  it("fills empty scalars from the structured payload", () => {
    const result = mergeStructuredIntoHealthProfile(emptyProfile(), structured());
    expect(result.age).toBe(42);
    expect(result.gender).toBe("male");
  });

  it("does not overwrite a scalar that is already set", () => {
    const profile = emptyProfile();
    profile.age = 30;
    profile.gender = "female";
    const result = mergeStructuredIntoHealthProfile(profile, structured());
    expect(result.age).toBe(30);
    expect(result.gender).toBe("female");
  });

  it("skips scalars listed in editedFields even when empty", () => {
    const profile = emptyProfile();
    profile.editedFields = ["age", "gender"];
    const result = mergeStructuredIntoHealthProfile(profile, structured());
    expect(result.age).toBe(null);
    expect(result.gender).toBe(null);
  });

  it("maps medicalHistory → conditions and currentMedications → medications as a deduped union", () => {
    const profile = emptyProfile();
    profile.conditions = ["asthma"];
    profile.medications = ["aspirin"];
    const result = mergeStructuredIntoHealthProfile(
      profile,
      structured({
        medicalHistory: ["asthma", "hypertension"],
        currentMedications: ["ibuprofen", "aspirin"],
      }),
    );
    expect(result.conditions).toEqual(["asthma", "hypertension"]);
    expect(result.medications).toEqual(["aspirin", "ibuprofen"]);
  });

  it("does not modify array fields listed in editedFields", () => {
    const profile = emptyProfile();
    profile.conditions = ["asthma"];
    profile.editedFields = ["conditions"];
    const result = mergeStructuredIntoHealthProfile(
      profile,
      structured({ medicalHistory: ["hypertension"] }),
    );
    expect(result.conditions).toEqual(["asthma"]);
  });

  it("ignores symptoms and vitals — they never land on the profile", () => {
    const profile = emptyProfile();
    const result = mergeStructuredIntoHealthProfile(
      profile,
      structured({ symptoms: ["chest pain", "shortness of breath"] }),
    );
    expect(result).not.toHaveProperty("symptoms");
    expect(result).not.toHaveProperty("vitals");
    expect(result.conditions).not.toContain("chest pain");
    expect(result.conditions).not.toContain("shortness of breath");
  });

  it("leaves allergies and bloodType untouched (editor-only fields)", () => {
    const profile = emptyProfile();
    profile.allergies = ["peanuts"];
    profile.bloodType = "O+";
    const result = mergeStructuredIntoHealthProfile(profile, structured());
    expect(result.allergies).toEqual(["peanuts"]);
    expect(result.bloodType).toBe("O+");
  });

  it("treats a missing medicalHistory/currentMedications as no-op", () => {
    const profile = emptyProfile();
    profile.conditions = ["asthma"];
    profile.medications = ["aspirin"];
    const result = mergeStructuredIntoHealthProfile(profile, {
      age: 50,
      gender: "female",
      symptoms: ["fever"],
    });
    expect(result.conditions).toEqual(["asthma"]);
    expect(result.medications).toEqual(["aspirin"]);
  });

  it("dedupes case- and whitespace-insensitively but preserves the original casing", () => {
    const profile = emptyProfile();
    profile.conditions = ["Asthma"];
    const result = mergeStructuredIntoHealthProfile(
      profile,
      structured({ medicalHistory: ["  asthma  ", "Hypertension"] }),
    );
    expect(result.conditions).toEqual(["Asthma", "Hypertension"]);
  });
});
