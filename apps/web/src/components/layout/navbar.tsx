"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { isDualRoleUser, Role } from "@disease-prediction/shared";
import {
  Activity,
  ArrowLeftRight,
  Brain,
  CalendarCheck,
  CalendarDays,
  History,
  LogIn,
  Stethoscope,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { enablePatientCapability } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";

type NavContext = "patient" | "doctor";

const NAV_CONTEXT_KEY = "medpredict.navContext";

// Where each context lands when the user switches into it — the primary surface
// for that role (doctor "Dashboard" is the appointments view, not the profile).
const CONTEXT_HOME: Record<NavContext, string> = {
  patient: "/predict",
  doctor: "/doctor/appointments",
};

function readPersistedContext(): NavContext | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(NAV_CONTEXT_KEY);
  return v === "patient" || v === "doctor" ? v : null;
}

function writePersistedContext(value: NavContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAV_CONTEXT_KEY, value);
}

const homeItem = { href: "/", label: "Home", icon: Activity };

// Doctor directory — a patient-facing surface for browsing/booking verified
// doctors. Shown only in the patient menu; `/doctors` itself requires auth.
const directoryItem = { href: "/doctors", label: "Doctors", icon: Stethoscope };

const patientItems = [
  { href: "/predict", label: "Predict", icon: Brain },
  { href: "/history", label: "History", icon: History },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
];

// Doctor surface: the appointments view is the dashboard; onboarding doubles
// as the editable profile once verified.
const doctorItems = [
  { href: "/doctor/appointments", label: "Dashboard", icon: CalendarCheck },
  { href: "/doctor/availability", label: "Availability", icon: CalendarDays },
  { href: "/doctor/onboarding", label: "Profile", icon: Stethoscope },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { user, setUser } = useUser();
  const [context, setContextState] = useState<NavContext>("patient");
  const [registering, setRegistering] = useState(false);

  // Default context is the user's primary role. For a dual user, a persisted
  // choice wins so a "switch" survives a page navigation.
  useEffect(() => {
    if (!user) return;
    const dual = isDualRoleUser(user);
    const persisted = readPersistedContext();
    if (dual && persisted) {
      setContextState(persisted);
      return;
    }
    setContextState(user.role === Role.DOCTOR ? "doctor" : "patient");
  }, [user]);

  const setContext = useCallback((next: NavContext) => {
    setContextState(next);
    writePersistedContext(next);
  }, []);

  // Switching context also navigates to that role's home — otherwise the nav
  // links swap but the user is left stranded on the previous role's page.
  const switchContext = useCallback(() => {
    const next: NavContext = context === "patient" ? "doctor" : "patient";
    setContext(next);
    router.push(CONTEXT_HOME[next]);
  }, [context, setContext, router]);

  const handleRegisterAsPatient = useCallback(async () => {
    setRegistering(true);
    try {
      const token = await getToken();
      const res = await enablePatientCapability(token);
      if (res.success && res.data) {
        setUser(res.data);
        // Drop the new patient capability straight into patient context and take
        // the user to the patient surface they just unlocked.
        setContext("patient");
        router.push(CONTEXT_HOME.patient);
      }
    } finally {
      setRegistering(false);
    }
  }, [getToken, setContext, setUser, router]);

  const dualRole = user ? isDualRoleUser(user) : false;
  const canRegisterAsPatient = !!user && user.role === Role.DOCTOR && !user.patientCapability;

  let navItems: { href: string; label: string; icon: typeof Activity }[];
  if (!isSignedIn || !user || user.role === null) {
    // Signed-out, unsynced, or role not chosen yet → neutral menu only. The
    // role gate bounces role-less users away; this also kills a patient-menu
    // flash before that redirect lands.
    navItems = [homeItem];
  } else if (user.role === Role.DOCTOR && (context === "doctor" || !user.patientCapability)) {
    navItems = [homeItem, ...doctorItems];
  } else {
    // PATIENT primary role, or DOCTOR currently in patient context — the only
    // surface that gets the patient-facing doctor directory.
    navItems = [homeItem, directoryItem, ...patientItems];
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors duration-200">
            <Brain className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 rounded-lg bg-primary/10 blur-sm group-hover:blur-md transition-all duration-200" />
          </div>
          <span className="text-lg font-bold gradient-text hidden sm:inline-block">
            MedPredict AI
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          {dualRole ? (
            <Button variant="ghost" size="sm" className="gap-2" onClick={switchContext}>
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">
                Switch to {context === "patient" ? "Doctor" : "Patient"}
              </span>
            </Button>
          ) : null}

          {canRegisterAsPatient ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRegisterAsPatient}
              disabled={registering}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {registering ? "Registering…" : "Register as patient"}
              </span>
            </Button>
          ) : null}

          <div className="ml-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="redirect">
                <Button size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </SignInButton>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
