import { getAuth } from "@clerk/express";
import type { Role } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository";

type AuthResolver = (req: Request) => { userId: string | null };
type RoleLookup = (userId: string) => Promise<Role | null>;

/**
 * Build a `requireRole(role)` middleware around a Clerk auth resolver and a
 * role lookup. Exposed for tests; production code uses the default
 * `requireRole` export below.
 */
export function makeRequireRole(authResolver: AuthResolver, roleLookup: RoleLookup) {
  return (required: Role) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { userId } = authResolver(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Authentication required" });
        return;
      }

      try {
        const role = await roleLookup(userId);
        if (role !== required) {
          res.status(403).json({ success: false, error: "Forbidden" });
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
 * Gate routes by primary role. Reuses Clerk auth + `userId` extraction; queries
 * `User.role` from Postgres and 403s on mismatch.
 */
export const requireRole = makeRequireRole(
  (req) => ({ userId: getAuth(req).userId ?? null }),
  (userId) => defaultUserRepository.getRole(userId),
);
