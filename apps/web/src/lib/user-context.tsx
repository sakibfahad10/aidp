"use client";

import { useAuth } from "@clerk/nextjs";
import type { CurrentUserResponse } from "@disease-prediction/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/api";

interface UserContextValue {
  /** The signed-in user's profile, or `null` when signed out / not yet synced. */
  user: CurrentUserResponse | null;
  /** True until the first `/users/me` resolution completes for a signed-in user. */
  isLoading: boolean;
  /** Push a fresh user (e.g. after a role change) so consumers update without a refetch. */
  setUser: (user: CurrentUserResponse | null) => void;
  /** Re-fetch `/users/me`. */
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

/**
 * Single source of truth for the current user's role/capability. Fetches
 * `/users/me` once per sign-in and shares it with the navbar and the role
 * guard, so role/capability decisions never diverge or double-fetch.
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const token = await getToken();
      const res = await getCurrentUser(token);
      setUser(res.success && res.data ? res.data : null);
    } catch {
      // Webhook may not have synced the row yet; treat as "no usable profile".
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    setIsLoading(true);
    void refresh();
  }, [isLoaded, refresh]);

  const value = useMemo<UserContextValue>(
    () => ({ user, isLoading: isLoading && isSignedIn === true, setUser, refresh }),
    [user, isLoading, isSignedIn, refresh],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
