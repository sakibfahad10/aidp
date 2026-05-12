import { z } from "zod";

/**
 * Body of POST /api/v1/appointments — the patient picks an open
 * `AvailabilitySlot` by id and optionally attaches a short note (reason
 * for visit). The note is trimmed and capped at 1000 chars; empty strings
 * are normalized to `undefined` so the database stores NULL rather than ""
 * (the briefing's "no note supplied" path renders cleaner on NULL).
 */
export const bookSlotRequestSchema = z.object({
  slotId: z.string().min(1, "slotId is required"),
  note: z
    .string()
    .trim()
    .max(1000, "Note is too long")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type BookSlotRequest = z.infer<typeof bookSlotRequestSchema>;

/**
 * One appointment as returned by the API. The slot's `startTime` is
 * denormalized into the row so upcoming-vs-past can be computed on the
 * client without a separate slot lookup, and so the doctor / patient
 * names render in one round-trip.
 *
 * Upcoming vs past is **always derived** by comparing `slotStartTime` to
 * `Date.now()` — there is no stored status, so an appointment can move
 * from "upcoming" to "past" without any write.
 */
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorUserId: string;
  doctorName: string | null;
  slotId: string;
  slotStartTime: string;
  note: string | null;
  createdAt: string;
}

/**
 * Patient or doctor appointments split into upcoming vs past — derived
 * server-side from the same now() the request is served at so the two
 * sides agree.
 */
export interface AppointmentListResponse {
  upcoming: Appointment[];
  past: Appointment[];
}

/**
 * Pure split helper exported so both the API and the web can sort/split
 * an appointments list the same way. Upcoming = `slotStartTime > now`,
 * past = `slotStartTime <= now`. Upcoming is returned ascending (next
 * appointment first); past descending (most recent first).
 */
export function splitAppointmentsByTime(
  appointments: Appointment[],
  now: Date = new Date(),
): AppointmentListResponse {
  const nowMs = now.getTime();
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];
  for (const appt of appointments) {
    if (new Date(appt.slotStartTime).getTime() > nowMs) {
      upcoming.push(appt);
    } else {
      past.push(appt);
    }
  }
  upcoming.sort(
    (a, b) => new Date(a.slotStartTime).getTime() - new Date(b.slotStartTime).getTime(),
  );
  past.sort((a, b) => new Date(b.slotStartTime).getTime() - new Date(a.slotStartTime).getTime());
  return { upcoming, past };
}
