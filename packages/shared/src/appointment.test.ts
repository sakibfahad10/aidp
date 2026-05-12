import { describe, expect, it } from "vitest";
import type { Appointment } from "./appointment";
import { bookSlotRequestSchema, splitAppointmentsByTime } from "./appointment";

function appt(
  overrides: Partial<Appointment> & { id: string; slotStartTime: string },
): Appointment {
  return {
    patientId: "pat_1",
    patientName: "Pat",
    doctorId: "doc_1",
    doctorUserId: "user_doc_1",
    doctorName: "Dr Who",
    slotId: `slot_${overrides.id}`,
    note: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("bookSlotRequestSchema", () => {
  it("accepts a slotId-only body and leaves note undefined", () => {
    const parsed = bookSlotRequestSchema.parse({ slotId: "slot_abc" });
    expect(parsed).toEqual({ slotId: "slot_abc", note: undefined });
  });

  it("trims a present note and keeps it", () => {
    const parsed = bookSlotRequestSchema.parse({ slotId: "slot_abc", note: "  Chest pain  " });
    expect(parsed.note).toBe("Chest pain");
  });

  it("normalizes empty / whitespace-only notes to undefined", () => {
    expect(bookSlotRequestSchema.parse({ slotId: "slot_abc", note: "" }).note).toBeUndefined();
    expect(bookSlotRequestSchema.parse({ slotId: "slot_abc", note: "   " }).note).toBeUndefined();
  });

  it("rejects an empty slotId", () => {
    expect(() => bookSlotRequestSchema.parse({ slotId: "" })).toThrow();
  });

  it("rejects a note over the length cap", () => {
    expect(() =>
      bookSlotRequestSchema.parse({ slotId: "slot_abc", note: "x".repeat(1001) }),
    ).toThrow();
  });
});

describe("splitAppointmentsByTime", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("puts future-startTime appointments in upcoming and past ones in past", () => {
    const future = appt({ id: "future", slotStartTime: "2026-06-14T13:00:00.000Z" });
    const past = appt({ id: "past", slotStartTime: "2026-06-14T11:00:00.000Z" });
    const { upcoming, past: pastList } = splitAppointmentsByTime([future, past], now);
    expect(upcoming.map((a) => a.id)).toEqual(["future"]);
    expect(pastList.map((a) => a.id)).toEqual(["past"]);
  });

  it("orders upcoming ascending (next first) and past descending (most recent first)", () => {
    const later = appt({ id: "later", slotStartTime: "2026-06-14T15:00:00.000Z" });
    const soon = appt({ id: "soon", slotStartTime: "2026-06-14T13:00:00.000Z" });
    const old = appt({ id: "old", slotStartTime: "2026-06-10T09:00:00.000Z" });
    const recent = appt({ id: "recent", slotStartTime: "2026-06-13T09:00:00.000Z" });

    const { upcoming, past } = splitAppointmentsByTime([later, soon, old, recent], now);
    expect(upcoming.map((a) => a.id)).toEqual(["soon", "later"]);
    expect(past.map((a) => a.id)).toEqual(["recent", "old"]);
  });

  it("treats startTime exactly equal to now as past (not upcoming)", () => {
    const equal = appt({ id: "equal", slotStartTime: now.toISOString() });
    const { upcoming, past } = splitAppointmentsByTime([equal], now);
    expect(upcoming).toEqual([]);
    expect(past.map((a) => a.id)).toEqual(["equal"]);
  });

  it("returns empty lists for an empty input", () => {
    expect(splitAppointmentsByTime([], now)).toEqual({ upcoming: [], past: [] });
  });
});
