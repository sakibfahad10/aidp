"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentUser } from "@/lib/api";
import { landingPathForRole } from "@/lib/role";

/**
 * Post-sign-in dispatcher. Fetches the user's role and sends:
 *   - users with no role → /role-gate (one-time choice)
 *   - users with a role → their primary-role landing area
 *
 * `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` point here so the
 * gate decision happens once per sign-in, not on every page.
 */
export default function PostSignInPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const response = await getCurrentUser(token);
        if (cancelled) return;
        const role = response.data?.role ?? null;
        router.replace(landingPathForRole(role));
      } catch {
        if (cancelled) return;
        // Webhook may not have created the User row yet — try the gate, which
        // will retry the lookup; if that also fails the user can refresh.
        router.replace("/role-gate");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-sm text-muted-foreground">Setting up your account…</div>
    </div>
  );
}
