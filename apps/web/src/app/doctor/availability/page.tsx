"use client";

import { useAuth } from "@clerk/nextjs";
import type { AvailabilitySlot } from "@disease-prediction/shared";
import { SlotStatus } from "@disease-prediction/shared";
import { AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOwnAvailability, setBulkAvailability, toggleAvailabilitySlot } from "@/lib/api";

const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00 – 18:00
const DAYS = 7;

// Grid starts at today (UTC midnight) and runs forward — a rolling window of
// current/future days, so the doctor never sets availability on past dates.
function startOfTodayUtc(reference: Date): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
}

function cellTime(gridStart: Date, dayOffset: number, hour: number): Date {
  const t = new Date(gridStart);
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

type CellState = "free" | "open" | "booked";

function cellStateFor(slot: AvailabilitySlot | undefined): CellState {
  if (slot?.status === SlotStatus.BOOKED) return "booked";
  if (slot?.status === SlotStatus.OPEN) return "open";
  return "free";
}

function cellLabel(state: CellState): string {
  switch (state) {
    case "booked":
      return "Booked";
    case "open":
      return "Open";
    case "free":
      return "Free";
  }
}

function ariaLabelFor(state: CellState, time: Date): string {
  const iso = time.toISOString();
  switch (state) {
    case "booked":
      return `Booked slot at ${iso}`;
    case "open":
      return `Remove slot at ${iso}`;
    case "free":
      return `Add slot at ${iso}`;
  }
}

const CELL_BASE = "h-9 w-full rounded-md border text-xs transition-colors";
const CELL_STATE_CLASSES: Record<CellState, string> = {
  booked: "cursor-not-allowed border-orange-300 bg-orange-100 text-orange-700",
  open: "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  free: "border-muted bg-muted/30 text-muted-foreground hover:bg-muted",
};

function cellClassName(state: CellState, isPending: boolean): string {
  return [CELL_BASE, CELL_STATE_CLASSES[state], isPending ? "opacity-60" : ""].join(" ");
}

export default function DoctorAvailabilityPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [slots, setSlots] = useState<Map<string, AvailabilitySlot>>(new Map());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridStart] = useState<Date>(() => startOfTodayUtc(new Date()));

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
        const d = new Date(gridStart);
        d.setUTCDate(d.getUTCDate() + i);
        return d;
      }),
    [gridStart],
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

  // Collect the cell times across the week whose current state matches `want`
  // and whose (dayOffset, hour) satisfies `match` — used to compute the delta
  // for a preset or per-day action without touching booked cells.
  function collectCells(
    want: CellState,
    match: (dayOffset: number, hour: number) => boolean,
  ): Date[] {
    const out: Date[] = [];
    for (let dayOffset = 0; dayOffset < DAYS; dayOffset++) {
      for (const hour of HOURS) {
        if (!match(dayOffset, hour)) continue;
        const time = cellTime(gridStart, dayOffset, hour);
        if (cellStateFor(slots.get(isoKey(time))) === want) out.push(time);
      }
    }
    return out;
  }

  // Apply a batch of opens/closes in one request, then rebuild from the result.
  async function applyBulk(openTimes: Date[], closeTimes: Date[]) {
    if (busy || (openTimes.length === 0 && closeTimes.length === 0)) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await setBulkAvailability(
        openTimes.map((t) => t.toISOString()),
        closeTimes.map((t) => t.toISOString()),
        token,
      );
      const next = new Map<string, AvailabilitySlot>();
      for (const slot of res.data ?? []) next.set(isoKey(new Date(slot.startTime)), slot);
      setSlots(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setBusy(false);
    }
  }

  // Presets open every still-free cell in their window (booked/already-open are
  // left as-is); "Clear week" closes every still-open cell.
  const openPreset = (match: (dayOffset: number, hour: number) => boolean) =>
    applyBulk(collectCells("free", match), []);
  const clearWeek = () =>
    applyBulk(
      [],
      collectCells("open", () => true),
    );
  const openDay = (dayOffset: number) =>
    applyBulk(
      collectCells("free", (d) => d === dayOffset),
      [],
    );
  const clearDay = (dayOffset: number) =>
    applyBulk(
      [],
      collectCells("open", (d) => d === dayOffset),
    );

  // Mon–Fri are dayOffsets 0–4 (week starts Monday); 9–5 = start times 09:00–16:00.
  const isWeekday = (dayOffset: number) => dayOffset <= 4;
  const controlsDisabled = loading || busy;

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
                Use a quick-fill preset or a day's Open/Clear to set many slots at once, or toggle a
                single cell. Booked slots are locked.
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

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Quick fill:</span>
            <Button
              variant="outline"
              size="sm"
              disabled={controlsDisabled}
              onClick={() => void openPreset((d, h) => isWeekday(d) && h >= 9 && h <= 16)}
            >
              Weekdays 9–5
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={controlsDisabled}
              onClick={() => void openPreset((_, h) => h >= 9 && h <= 11)}
            >
              Mornings (9–12)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={controlsDisabled}
              onClick={() => void openPreset((_, h) => h >= 13 && h <= 16)}
            >
              Afternoons (1–5)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={controlsDisabled}
              onClick={() => void clearWeek()}
            >
              Clear week
            </Button>
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="w-16 text-left text-xs font-medium text-muted-foreground">Time</th>
                  {days.map((day, dayOffset) => (
                    <th
                      key={day.toISOString()}
                      className="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      <div>{formatDayHeader(day)}</div>
                      <div className="mt-1 flex justify-center gap-1">
                        <button
                          type="button"
                          disabled={controlsDisabled}
                          onClick={() => void openDay(dayOffset)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={controlsDisabled}
                          onClick={() => void clearDay(dayOffset)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="text-xs text-muted-foreground">{formatHour(hour)}</td>
                    {days.map((_, dayOffset) => {
                      const time = cellTime(gridStart, dayOffset, hour);
                      const key = isoKey(time);
                      const slot = slots.get(key);
                      const cellState = cellStateFor(slot);
                      const isPending = pending.has(key);
                      return (
                        <td key={key} className="p-0">
                          <button
                            type="button"
                            aria-label={ariaLabelFor(cellState, time)}
                            aria-pressed={cellState === "open"}
                            disabled={cellState === "booked" || isPending}
                            onClick={() => void onToggleCell(time)}
                            className={cellClassName(cellState, isPending)}
                          >
                            {isPending ? (
                              <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                            ) : (
                              cellLabel(cellState)
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
