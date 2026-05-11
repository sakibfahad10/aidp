"use client";

import { useAuth } from "@clerk/nextjs";
import type { AvailabilitySlot } from "@disease-prediction/shared";
import { SlotStatus } from "@disease-prediction/shared";
import { AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOwnAvailability, toggleAvailabilitySlot } from "@/lib/api";

const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00 – 18:00
const DAYS = 7;

function startOfWeekUtc(reference: Date): Date {
  const d = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  // Monday = 1 ... Sunday = 0 ; align week start to Monday for clinic-style grid.
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function cellTime(weekStart: Date, dayOffset: number, hour: number): Date {
  const t = new Date(weekStart);
  t.setUTCDate(t.getUTCDate() + dayOffset);
  t.setUTCHours(hour, 0, 0, 0);
  return t;
}

function formatDayHeader(day: Date): string {
  return day.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function isoKey(date: Date): string {
  return date.toISOString();
}

export default function DoctorAvailabilityPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [slots, setSlots] = useState<Map<string, AvailabilitySlot>>(new Map());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart] = useState<Date>(() => startOfWeekUtc(new Date()));

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      const res = await getOwnAvailability(token);
      const next = new Map<string, AvailabilitySlot>();
      for (const slot of res.data ?? []) next.set(isoKey(new Date(slot.startTime)), slot);
      setSlots(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void refresh();
  }, [isLoaded, isSignedIn, refresh]);

  const days = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + i);
        return d;
      }),
    [weekStart],
  );

  async function onToggleCell(time: Date) {
    const key = isoKey(time);
    if (pending.has(key)) return;
    setPending((prev) => new Set(prev).add(key));
    setError(null);
    try {
      const token = await getToken();
      const res = await toggleAvailabilitySlot(time.toISOString(), token);
      setSlots((prev) => {
        const next = new Map(prev);
        if (res.data?.action === "created" && res.data.slot) {
          next.set(key, res.data.slot);
        } else {
          next.delete(key);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle slot");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Sign in as a doctor to manage your availability.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Availability
              </CardTitle>
              <CardDescription>
                Toggle a cell to open a bookable slot; toggle again to remove it. Booked slots are
                locked.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="w-16 text-left text-xs font-medium text-muted-foreground">Time</th>
                  {days.map((day) => (
                    <th
                      key={day.toISOString()}
                      className="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      {formatDayHeader(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="text-xs text-muted-foreground">{formatHour(hour)}</td>
                    {days.map((_, dayOffset) => {
                      const time = cellTime(weekStart, dayOffset, hour);
                      const key = isoKey(time);
                      const slot = slots.get(key);
                      const isOpen = slot?.status === SlotStatus.OPEN;
                      const isBooked = slot?.status === SlotStatus.BOOKED;
                      const isPending = pending.has(key);
                      const label = isBooked ? "Booked" : isOpen ? "Open" : "Free";
                      const aria = isBooked
                        ? `Booked slot at ${time.toISOString()}`
                        : `${isOpen ? "Remove" : "Add"} slot at ${time.toISOString()}`;
                      return (
                        <td key={key} className="p-0">
                          <button
                            type="button"
                            aria-label={aria}
                            aria-pressed={isOpen}
                            disabled={isBooked || isPending}
                            onClick={() => void onToggleCell(time)}
                            className={[
                              "h-9 w-full rounded-md border text-xs transition-colors",
                              isBooked
                                ? "cursor-not-allowed border-orange-300 bg-orange-100 text-orange-700"
                                : isOpen
                                  ? "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "border-muted bg-muted/30 text-muted-foreground hover:bg-muted",
                              isPending ? "opacity-60" : "",
                            ].join(" ")}
                          >
                            {isPending ? (
                              <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                            ) : (
                              label
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
