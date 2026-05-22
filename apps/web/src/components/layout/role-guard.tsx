"use client";

import { useAuth } from "@clerk/nextjs";
import { hasPatientCapability, Role } from "@disease-prediction/shared";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { landingPathForRole } from "@/lib/role";
import { useUser } from "@/lib/user-context";

// Patient-capability-gated screens (mirror the `requirePatientCapability` API routes).
const PATIENT_PREFIXES = ["/predict", "/history", "/profile", "/appointments"];
// Doctor-role-gated screens. Note: `/doctors` (public directory) is handled as
// exempt below and must be checked first, since it also starts with `/doctor`.
const DOCTOR_PREFIX = "/doctor";

function isExempt(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/role-gate" ||
    pathname === "/post-signin" ||
    pathname.startsWith("/doctors")
  );
}

function isPatientRoute(pathname: string): boolean {
  return PATIENT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isDoctorRoute(pathname: string): boolean {
  // `/doctors*` is already excluded by isExempt(); here `/doctor` only matches
  // the dashboard surface (`/doctor`, `/doctor/...`).
  return pathname === DOCTOR_PREFIX || pathname.startsWith(`${DOCTOR_PREFIX}/`);
}

/**
 * Resolve the path a signed-in user should be redirected to, or `null` to let
 * the current page render. Centralizes the gate UX so a role-less or
 * wrong-surface user never reaches a screen that would 403.
 */
function redirectFor(pathname: string, user: ReturnType<typeof useUser>["user"]): string | null {
  if (isExempt(pathname)) return null;

  // No synced profile, or role not chosen yet → the one-time role gate.
  if (!user || user.role === null) return "/role-gate";

  if (isPatientRoute(pathname) && !hasPatientCapability(user)) {
    // A DOCTOR who hasn't opted into patient capability; send them to their
    // own surface. The navbar's "Register as patient" button is the opt-in.
    return landingPathForRole(user.role);
  }

  if (isDoctorRoute(pathname) && user.role !== Role.DOCTOR) {
    return landingPathForRole(user.role);
  }

  return null;
}

/**
 * Client-side gate. For signed-in users it resolves role/capability and
 * redirects before a gated screen renders, replacing the raw
 * "Patient capability required" 403 with a clean route to the right place.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const exempt = isExempt(pathname);
  const target = isSignedIn && !isLoading ? redirectFor(pathname, user) : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  // Signed-out users and exempt paths render normally; Clerk middleware handles
  // auth-protection for non-public routes.
  if (!isSignedIn || exempt) return <>{children}</>;

  // Block the protected screen from painting while we resolve the user or
  // while a redirect is pending — this is what prevents the 403 flash.
  if (isLoading || target) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
