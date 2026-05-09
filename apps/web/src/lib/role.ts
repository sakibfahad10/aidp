import { Role } from "@disease-prediction/shared";

/**
 * Primary landing path for a role. `null` means "no role yet" and routes to
 * the role gate. The doctor dashboard does not exist yet; doctors share the
 * predict landing for now (later slices under PRD #9 will own /doctor).
 */
export function landingPathForRole(role: Role | null | undefined): string {
  if (role === Role.DOCTOR) return "/predict";
  if (role === Role.PATIENT) return "/predict";
  return "/role-gate";
}
