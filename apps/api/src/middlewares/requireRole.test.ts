import { Role } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { makeRequireRole } from "./requireRole";

function mockReqRes() {
  const status = vi.fn();
  const json = vi.fn();
  status.mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { res, next, status, json };
}

describe("requireRole", () => {
  it("calls next() when the authenticated user has the required role", async () => {
    const lookup = vi.fn().mockResolvedValue(Role.DOCTOR);
    const middleware = makeRequireRole(() => ({ userId: "user_doctor" }), lookup)(Role.DOCTOR);

    const { res, next, status } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(lookup).toHaveBeenCalledWith("user_doctor");
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the request is unauthenticated", async () => {
    const lookup = vi.fn();
    const middleware = makeRequireRole(() => ({ userId: null }), lookup)(Role.DOCTOR);

    const { res, next, status, json } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(lookup).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Authentication required" }),
    );
  });

  it("rejects with 403 when the user has a different role", async () => {
    const lookup = vi.fn().mockResolvedValue(Role.PATIENT);
    const middleware = makeRequireRole(() => ({ userId: "user_patient" }), lookup)(Role.DOCTOR);

    const { res, next, status, json } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Forbidden" }),
    );
  });

  it("rejects with 403 when the user is not found", async () => {
    const lookup = vi.fn().mockResolvedValue(null);
    const middleware = makeRequireRole(() => ({ userId: "user_missing" }), lookup)(Role.DOCTOR);

    const { res, next, status } = mockReqRes();
    await middleware({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });
});
