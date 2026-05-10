import { Role } from "@disease-prediction/shared";

/**
 * Primary landing path for a role. `null`/`undefined` means "no role yet" and
 * routes to the role gate. Doctors land in the onboarding wizard; once
 * verified, the wizard self-routes to the doctor dashboard (later slice).
 */
export function landingPathForRole(role: Role | null | undefined): string {
  if (!role) return "/role-gate";
  if (role === Role.DOCTOR) return "/doctor/onboarding";
  return "/predict";
}
