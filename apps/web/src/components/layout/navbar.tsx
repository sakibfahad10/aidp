"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { type CurrentUserResponse, isDualRoleUser, Role } from "@disease-prediction/shared";
import {
  Activity,
  ArrowLeftRight,
  Brain,
  History,
  LogIn,
  Stethoscope,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { enablePatientCapability, getCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavContext = "patient" | "doctor";

const NAV_CONTEXT_KEY = "medpredict.navContext";

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

const patientItems = [
  { href: "/predict", label: "Predict", icon: Brain },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: UserRound },
];

// Doctor surface is currently the onboarding/dashboard-stub page; later
// PRD #9 slices replace this with a proper dashboard route.
const doctorItems = [{ href: "/doctor/onboarding", label: "Dashboard", icon: Stethoscope }];

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, getToken } = useAuth();
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [context, setContextState] = useState<NavContext>("patient");
  const [registering, setRegistering] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      return;
    }
    try {
      const token = await getToken();
      const res = await getCurrentUser(token);
      if (res.success && res.data) setUser(res.data);
    } catch {
      // Swallow — nav still renders the public surface if the user fetch fails.
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

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

  const handleRegisterAsPatient = useCallback(async () => {
    setRegistering(true);
    try {
      const token = await getToken();
      const res = await enablePatientCapability(token);
      if (res.success && res.data) {
        setUser(res.data);
        // Drop the new patient capability straight into patient context so the
        // user sees Predict/History/Profile appear immediately.
        setContext("patient");
      }
    } finally {
      setRegistering(false);
    }
  }, [getToken, setContext]);

  const dualRole = user ? isDualRoleUser(user) : false;
  const canRegisterAsPatient = !!user && user.role === Role.DOCTOR && !user.patientCapability;

  let navItems: { href: string; label: string; icon: typeof Activity }[];
  if (!isSignedIn || !user) {
    navItems = [homeItem];
  } else if (user.role === Role.DOCTOR && (context === "doctor" || !user.patientCapability)) {
    navItems = [homeItem, ...doctorItems];
  } else {
    // PATIENT primary role, or DOCTOR currently in patient context.
    navItems = [homeItem, ...patientItems];
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
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setContext(context === "patient" ? "doctor" : "patient")}
            >
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
