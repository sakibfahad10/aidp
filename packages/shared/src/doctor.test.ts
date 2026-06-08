import { describe, expect, it } from "vitest";
import {
  bmdcNumberSchema,
  City,
  citySchema,
  DoctorStatus,
  directoryQuerySchema,
  doctorOnboardingDraftSchema,
  doctorOnboardingSubmitSchema,
  doctorStatusSchema,
  isValidBmdcNumber,
  normalizeBmdcNumber,
  Specialty,
  specialtySchema,
} from "./doctor";

describe("isValidBmdcNumber", () => {
  it("accepts the A-12345 form", () => {
    expect(isValidBmdcNumber("A-12345")).toBe(true);
  });

  it("accepts the B-12345 form", () => {
    expect(isValidBmdcNumber("B-12345")).toBe(true);
  });

  it("accepts lowercase prefixes", () => {
    expect(isValidBmdcNumber("a-12345")).toBe(true);
    expect(isValidBmdcNumber("b-12345")).toBe(true);
  });

  it("accepts the A12345 form (prefix without dash)", () => {
    expect(isValidBmdcNumber("A12345")).toBe(true);
  });

  it("accepts bare digits in the 3-7 range", () => {
    expect(isValidBmdcNumber("123")).toBe(true);
    expect(isValidBmdcNumber("12345")).toBe(true);
    expect(isValidBmdcNumber("1234567")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isValidBmdcNumber("")).toBe(false);
  });

  it("rejects too-short digit runs (under 3)", () => {
    expect(isValidBmdcNumber("12")).toBe(false);
    expect(isValidBmdcNumber("A-12")).toBe(false);
  });

  it("rejects too-long digit runs (over 7)", () => {
    expect(isValidBmdcNumber("12345678")).toBe(false);
    expect(isValidBmdcNumber("A-12345678")).toBe(false);
  });

  it("rejects junk and wrong prefixes", () => {
    expect(isValidBmdcNumber("X-12345")).toBe(false);
    expect(isValidBmdcNumber("AB-12345")).toBe(false);
    expect(isValidBmdcNumber("doctor")).toBe(false);
    expect(isValidBmdcNumber("A-12-345")).toBe(false);
    expect(isValidBmdcNumber("12345A")).toBe(false);
  });
});

describe("normalizeBmdcNumber", () => {
  it("uppercases the prefix", () => {
    expect(normalizeBmdcNumber("a-12345")).toBe("A-12345");
    expect(normalizeBmdcNumber("b-12345")).toBe("B-12345");
  });

  it("leaves an already-normalized value untouched", () => {
    expect(normalizeBmdcNumber("A-12345")).toBe("A-12345");
    expect(normalizeBmdcNumber("12345")).toBe("12345");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeBmdcNumber("  a-12345  ")).toBe("A-12345");
  });
});

describe("bmdcNumberSchema", () => {
  it("parses and normalizes a valid number", () => {
    expect(bmdcNumberSchema.parse("a-12345")).toBe("A-12345");
    expect(bmdcNumberSchema.parse("  B-987654  ")).toBe("B-987654");
    expect(bmdcNumberSchema.parse("12345")).toBe("12345");
  });

  it("rejects invalid numbers", () => {
    expect(bmdcNumberSchema.safeParse("").success).toBe(false);
    expect(bmdcNumberSchema.safeParse("12").success).toBe(false);
    expect(bmdcNumberSchema.safeParse("X-12345").success).toBe(false);
  });
});

describe("specialtySchema", () => {
  it("accepts every controlled specialty", () => {
    for (const value of Object.values(Specialty)) {
      expect(specialtySchema.parse(value)).toBe(value);
    }
  });

  it("rejects unknown specialty strings", () => {
    expect(specialtySchema.safeParse("Astrology").success).toBe(false);
    expect(specialtySchema.safeParse("").success).toBe(false);
  });

  it("includes GeneralMedicine as the fallback", () => {
    expect(Specialty.GeneralMedicine).toBe("GeneralMedicine");
  });
});

describe("citySchema", () => {
  it("accepts every controlled city", () => {
    for (const value of Object.values(City)) {
      expect(citySchema.parse(value)).toBe(value);
    }
  });

  it("rejects unknown city strings", () => {
    expect(citySchema.safeParse("Atlantis").success).toBe(false);
  });
});

describe("doctorStatusSchema", () => {
  it("accepts draft, pending, and verified", () => {
    expect(doctorStatusSchema.parse("draft")).toBe(DoctorStatus.DRAFT);
    expect(doctorStatusSchema.parse("pending")).toBe(DoctorStatus.PENDING);
    expect(doctorStatusSchema.parse("verified")).toBe(DoctorStatus.VERIFIED);
  });

  it("rejects unknown statuses", () => {
    expect(doctorStatusSchema.safeParse("approved").success).toBe(false);
  });
});

describe("doctorOnboardingDraftSchema", () => {
  it("accepts an entirely empty draft (every field optional)", () => {
    const parsed = doctorOnboardingDraftSchema.parse({});
    expect(parsed).toEqual({});
  });

  it("accepts and normalizes a partial draft", () => {
    const parsed = doctorOnboardingDraftSchema.parse({
      bmdcNumber: "a-12345",
      specialties: [Specialty.Cardiology],
    });
    expect(parsed.bmdcNumber).toBe("A-12345");
    expect(parsed.specialties).toEqual([Specialty.Cardiology]);
  });

  it("rejects an invalid bmdcNumber even in a draft", () => {
    expect(doctorOnboardingDraftSchema.safeParse({ bmdcNumber: "X-12345" }).success).toBe(false);
  });

  it("rejects a draft with a negative fee", () => {
    expect(doctorOnboardingDraftSchema.safeParse({ feeBdt: -10 }).success).toBe(false);
  });
});

describe("doctorOnboardingSubmitSchema", () => {
  const valid = {
    name: "Dr. Tanvir Rahman",
    phone: "+8801712345678",
    publicEmail: "dr.public@example.com",
    bmdcNumber: "a-12345",
    qualifications: "MBBS, FCPS",
    specialties: [Specialty.Cardiology, Specialty.GeneralMedicine],
    affiliation: "Square Hospital",
    city: City.Dhaka,
    experienceYears: 10,
    feeBdt: 1500,
  };

  it("accepts a fully-populated submission and normalizes BMDC", () => {
    const parsed = doctorOnboardingSubmitSchema.parse(valid);
    expect(parsed.bmdcNumber).toBe("A-12345");
    expect(parsed.specialties).toEqual([Specialty.Cardiology, Specialty.GeneralMedicine]);
  });

  it("rejects an empty specialties list", () => {
    expect(doctorOnboardingSubmitSchema.safeParse({ ...valid, specialties: [] }).success).toBe(
      false,
    );
  });

  it("rejects a missing required field", () => {
    const { phone: _omit, ...rest } = valid;
    expect(doctorOnboardingSubmitSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-integer fee", () => {
    expect(doctorOnboardingSubmitSchema.safeParse({ ...valid, feeBdt: 1500.5 }).success).toBe(
      false,
    );
  });

  it("rejects a negative experience", () => {
    expect(doctorOnboardingSubmitSchema.safeParse({ ...valid, experienceYears: -1 }).success).toBe(
      false,
    );
  });

  it("rejects an invalid email", () => {
    expect(
      doctorOnboardingSubmitSchema.safeParse({ ...valid, publicEmail: "not-an-email" }).success,
    ).toBe(false);
  });
});

describe("directoryQuerySchema", () => {
  it("accepts an entirely empty query", () => {
    expect(directoryQuerySchema.parse({})).toEqual({});
  });

  it("accepts all three filters together", () => {
    const parsed = directoryQuerySchema.parse({
      specialty: Specialty.Cardiology,
      city: City.Dhaka,
      affiliation: "Square Hospital",
    });
    expect(parsed.specialty).toBe(Specialty.Cardiology);
    expect(parsed.city).toBe(City.Dhaka);
    expect(parsed.affiliation).toBe("Square Hospital");
  });

  it("rejects unknown specialty / city values", () => {
    expect(directoryQuerySchema.safeParse({ specialty: "Astrology" }).success).toBe(false);
    expect(directoryQuerySchema.safeParse({ city: "Atlantis" }).success).toBe(false);
  });

  it("trims affiliation and treats whitespace-only as absent", () => {
    expect(directoryQuerySchema.parse({ affiliation: "  Square  " }).affiliation).toBe("Square");
    expect(directoryQuerySchema.safeParse({ affiliation: "    " }).success).toBe(false);
  });
});
