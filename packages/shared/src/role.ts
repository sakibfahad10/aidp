import { z } from "zod";

/**
 * User's primary role on the platform. PATIENT is the default for everyone
 * created via the Clerk webhook; DOCTOR is opted into via the role gate.
 *
 * String values match the Prisma enum exactly so the API can pass either
 * direction without remapping.
 */
export enum Role {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
}

/** Default role for newly-created users, applied at webhook sync time. */
export const DEFAULT_ROLE: Role = Role.PATIENT;

/** Zod schema for a single Role value. */
export const roleSchema = z.nativeEnum(Role);

/** Body of POST /api/v1/users/role — the role gate choice. */
export const setRoleRequestSchema = z.object({
  role: roleSchema,
});

export type SetRoleRequest = z.infer<typeof setRoleRequestSchema>;

/**
 * Shape returned by GET /api/v1/users/me — the role-gate decision payload.
 *
 * `role` is nullable: a `null` here means the user has not picked through the
 * role gate yet, and the web app should route them to it.
 */
export interface CurrentUserResponse {
  id: string;
  email: string;
  name: string | null;
  role: Role | null;
}
