"use client";

import { useAuth } from "@clerk/nextjs";
import { Role } from "@disease-prediction/shared";
import { AlertCircle, Stethoscope, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setUserRole } from "@/lib/api";
import { landingPathForRole } from "@/lib/role";
import { useUser } from "@/lib/user-context";

export default function RoleGatePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user, isLoading, setUser } = useUser();
  const router = useRouter();
  const [submittingRole, setSubmittingRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If the user already chose a role, bounce them out so the gate is one-shot.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!isLoading && user?.role) {
      router.replace(landingPathForRole(user.role));
    }
  }, [isLoaded, isSignedIn, isLoading, user, router]);

  const choose = async (role: Role) => {
    setError(null);
    setSubmittingRole(role);
    try {
      const token = await getToken();
      const response = await setUserRole(role, token);
      if (!response.success) {
        throw new Error(response.error || "Failed to set role");
      }
      // Push the updated user into shared state before navigating so the route
      // guard sees the new role instead of bouncing us back to the gate.
      if (response.data) setUser(response.data);
      router.replace(landingPathForRole(role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set role");
      setSubmittingRole(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to <span className="gradient-text">MedPredict AI</span>
        </h1>
        <p className="text-muted-foreground">
          Tell us who you are so we can take you to the right place. You can do more later.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card
          className={
            submittingRole && submittingRole !== Role.PATIENT
              ? "opacity-50 pointer-events-none"
              : ""
          }
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <UserRound className="h-5 w-5" />
              </div>
              <CardTitle>Patient</CardTitle>
            </div>
            <CardDescription>
              Submit symptoms, vitals, or a medical report and get an AI risk assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => choose(Role.PATIENT)}
              disabled={submittingRole !== null}
            >
              {submittingRole === Role.PATIENT ? "Saving…" : "Continue as Patient"}
            </Button>
          </CardContent>
        </Card>

        <Card
          className={
            submittingRole && submittingRole !== Role.DOCTOR ? "opacity-50 pointer-events-none" : ""
          }
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <CardTitle>Doctor</CardTitle>
            </div>
            <CardDescription>
              Build a verified profile, list availability, and see patient briefings before each
              appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => choose(Role.DOCTOR)}
              disabled={submittingRole !== null}
            >
              {submittingRole === Role.DOCTOR ? "Saving…" : "Continue as Doctor"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
