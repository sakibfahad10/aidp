import { getAuth } from "@clerk/express";
import { hasPatientCapability, type Role } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository";

type AuthResolver = (req: Request) => { userId: string | null };
type CapabilityLookup = (
  userId: string,
) => Promise<{ role: Role | null; patientCapability: boolean } | null>;

/**
 * Build a `requirePatientCapability` middleware around a Clerk auth resolver
 * and a user capability lookup. Exposed for tests; production code uses the
 * default `requirePatientCapability` export below.
 *
 * Allows a PATIENT primary role, or a DOCTOR who has hit "register as a
 * patient". 401 when unauthenticated, 403 in every other case.
 */
export function makeRequirePatientCapability(
  authResolver: AuthResolver,
  capabilityLookup: CapabilityLookup,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId } = authResolver(req);
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    try {
      const user = await capabilityLookup(userId);
      if (!user || !hasPatientCapability(user)) {
        res.status(403).json({ success: false, error: "Patient capability required" });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

const defaultUserRepository = new UserRepository();

/**
 * Gate patient-side routes (HealthProfile, /predict, history, booking) on
 * patient capability. A DOCTOR without the additive flag is 403'd, so they
 * must hit "register as a patient" first.
 */
export const requirePatientCapability = makeRequirePatientCapability(
  (req) => ({ userId: getAuth(req).userId ?? null }),
  async (userId) => {
    const user = await defaultUserRepository.findById(userId);
    if (!user) return null;
    return { role: user.role as Role | null, patientCapability: user.patientCapability };
  },
);
