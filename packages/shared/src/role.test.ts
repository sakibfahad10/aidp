import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROLE,
  hasPatientCapability,
  isDualRoleUser,
  Role,
  roleSchema,
  setRoleRequestSchema,
} from "./role";

describe("Role", () => {
  it("exposes PATIENT and DOCTOR string values", () => {
    expect(Role.PATIENT).toBe("PATIENT");
    expect(Role.DOCTOR).toBe("DOCTOR");
  });

  it("defaults to PATIENT", () => {
    expect(DEFAULT_ROLE).toBe(Role.PATIENT);
  });
});

describe("roleSchema", () => {
  it("accepts PATIENT", () => {
    expect(roleSchema.parse("PATIENT")).toBe(Role.PATIENT);
  });

  it("accepts DOCTOR", () => {
    expect(roleSchema.parse("DOCTOR")).toBe(Role.DOCTOR);
  });

  it("rejects unknown values", () => {
    expect(roleSchema.safeParse("admin").success).toBe(false);
    expect(roleSchema.safeParse("patient").success).toBe(false);
    expect(roleSchema.safeParse("").success).toBe(false);
    expect(roleSchema.safeParse(null).success).toBe(false);
  });
});

describe("setRoleRequestSchema", () => {
  it("accepts a body with a valid role", () => {
    expect(setRoleRequestSchema.parse({ role: "PATIENT" })).toEqual({ role: Role.PATIENT });
    expect(setRoleRequestSchema.parse({ role: "DOCTOR" })).toEqual({ role: Role.DOCTOR });
  });

  it("rejects a body with an unknown role", () => {
    expect(setRoleRequestSchema.safeParse({ role: "admin" }).success).toBe(false);
  });

  it("rejects a missing role", () => {
    expect(setRoleRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("hasPatientCapability", () => {
  it("is true for a PATIENT regardless of the flag", () => {
    expect(hasPatientCapability({ role: Role.PATIENT, patientCapability: false })).toBe(true);
    expect(hasPatientCapability({ role: Role.PATIENT, patientCapability: true })).toBe(true);
  });

  it("is true for a DOCTOR who has opted into patient capability", () => {
    expect(hasPatientCapability({ role: Role.DOCTOR, patientCapability: true })).toBe(true);
  });

  it("is false for a DOCTOR who has not opted in", () => {
    expect(hasPatientCapability({ role: Role.DOCTOR, patientCapability: false })).toBe(false);
  });

  it("is false for a user whose role hasn't been chosen yet", () => {
    expect(hasPatientCapability({ role: null, patientCapability: false })).toBe(false);
    expect(hasPatientCapability({ role: null, patientCapability: true })).toBe(false);
  });
});

describe("isDualRoleUser", () => {
  it("is true only for a DOCTOR who has opted into patient capability", () => {
    expect(isDualRoleUser({ role: Role.DOCTOR, patientCapability: true })).toBe(true);
  });

  it("is false for a single-role DOCTOR", () => {
    expect(isDualRoleUser({ role: Role.DOCTOR, patientCapability: false })).toBe(false);
  });

  it("is false for a PATIENT (one-directional rule: doctors gain patient, not the other way)", () => {
    expect(isDualRoleUser({ role: Role.PATIENT, patientCapability: true })).toBe(false);
    expect(isDualRoleUser({ role: Role.PATIENT, patientCapability: false })).toBe(false);
  });

  it("is false when the role isn't chosen yet", () => {
    expect(isDualRoleUser({ role: null, patientCapability: true })).toBe(false);
  });
});
