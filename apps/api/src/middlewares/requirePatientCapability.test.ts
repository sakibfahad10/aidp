import { Role } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { makeRequirePatientCapability } from "./requirePatientCapability";

function mockReqRes() {
  const status = vi.fn();
  const json = vi.fn();
  status.mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { res, next, status, json };
}

describe("requirePatientCapability", () => {
  it("calls next() for a PATIENT", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: Role.PATIENT, patientCapability: true });
    const middleware = makeRequirePatientCapability(() => ({ userId: "user_patient" }), lookup);

    const { res, next, status } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(lookup).toHaveBeenCalledWith("user_patient");
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it("calls next() for a DOCTOR who has opted into patient capability", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: Role.DOCTOR, patientCapability: true });
    const middleware = makeRequirePatientCapability(() => ({ userId: "user_dual" }), lookup);

    const { res, next, status } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it("rejects with 403 for a DOCTOR who has not opted in", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: Role.DOCTOR, patientCapability: false });
    const middleware = makeRequirePatientCapability(() => ({ userId: "user_doctor" }), lookup);

    const { res, next, status, json } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Patient capability required" }),
    );
  });

  it("rejects with 401 when the request is unauthenticated", async () => {
    const lookup = vi.fn();
    const middleware = makeRequirePatientCapability(() => ({ userId: null }), lookup);

    const { res, next, status, json } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(lookup).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Authentication required" }),
    );
  });

  it("rejects with 403 when the user is not found", async () => {
    const lookup = vi.fn().mockResolvedValue(null);
    const middleware = makeRequirePatientCapability(() => ({ userId: "user_missing" }), lookup);

    const { res, next, status } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it("rejects with 403 when the role hasn't been chosen yet", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: null, patientCapability: false });
    const middleware = makeRequirePatientCapability(
      () => ({ userId: "user_gate_pending" }),
      lookup,
    );

    const { res, next, status } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });
});
