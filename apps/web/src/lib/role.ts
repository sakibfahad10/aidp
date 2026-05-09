import type { Role } from "@disease-prediction/shared";

/**
 * Primary landing path for a role. `null`/`undefined` means "no role yet" and
 * routes to the role gate. Doctors share `/predict` with patients for now;
 * later slices under PRD #9 will own `/doctor`.
 */
export function landingPathForRole(role: Role | null | undefined): string {
  return role ? "/predict" : "/role-gate";
}
