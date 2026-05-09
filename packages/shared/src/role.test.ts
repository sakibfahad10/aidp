import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE, Role, roleSchema, setRoleRequestSchema } from "./role";

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
