import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middlewares/errorHandler";
import type {
  AppointmentRepositoryLike,
  AppointmentRow,
  BookingOutcome,
} from "../repositories/appointmentRepository";
import { AppointmentService } from "./appointmentService";

const PATIENT_ID = "user_patient_1";
const DOCTOR_USER_ID = "user_doctor_1";
const DOCTOR_ID = "doc_1";
const SLOT_ID = "slot_1";

/**
 * Reusable in-memory fake of the AppointmentRepository. Mirrors the deep
 * concern under test: the booking call is atomic from the caller's
 * perspective — it either returns a row or a "slot-not-open" error, never
 * a partial state.
 *
 * The fake's "slot store" carries the minimum the booking transaction
 * needs (id, doctorId, startTime, status). Both `setSlot` and
 * `markBooked` are exposed so tests can simulate "race lost" /
 * "already booked" scenarios.
 */
function fakeRepo() {
  type SlotRecord = { id: string; doctorId: string; startTime: Date; status: "open" | "booked" };
  const slots = new Map<string, SlotRecord>();
  const appointments: AppointmentRow[] = [];
  let nextApptId = 1;

  const setSlot = (slot: SlotRecord) => slots.set(slot.id, slot);

  const repo: AppointmentRepositoryLike = {
    bookSlotTransaction: vi.fn(async (patientId, slotId, note): Promise<BookingOutcome> => {
      const slot = slots.get(slotId);
      if (slot?.status !== "open") return { error: "slot-not-open" };
      slot.status = "booked";
      const row: AppointmentRow = {
        id: `appt_${nextApptId++}`,
        patientId,
        patientName: "Patient One",
        doctorId: slot.doctorId,
        doctorUserId: DOCTOR_USER_ID,
        doctorName: "Dr Test",
        slotId,
        slotStartTime: slot.startTime,
        note,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      };
      appointments.push(row);
      return { row };
    }),
    listForPatient: vi.fn(async (patientId) =>
      appointments.filter((a) => a.patientId === patientId),
    ),
    listForDoctorUserId: vi.fn(async (userId) =>
      userId === DOCTOR_USER_ID ? [...appointments] : [],
    ),
    findByIdForDoctorUserId: vi.fn(async (id, userId) =>
      userId === DOCTOR_USER_ID ? (appointments.find((a) => a.id === id) ?? null) : null,
    ),
  };

  return { repo, slots, setSlot, appointments };
}

describe("AppointmentService.bookSlot", () => {
  let svc: AppointmentService;
  let helpers: ReturnType<typeof fakeRepo>;

  beforeEach(() => {
    helpers = fakeRepo();
    svc = new AppointmentService(helpers.repo);
  });

  it("books an open slot — flips it to booked and creates exactly one Appointment", async () => {
    helpers.setSlot({
      id: SLOT_ID,
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-07-01T10:00:00.000Z"),
      status: "open",
    });

    const appt = await svc.bookSlot(PATIENT_ID, SLOT_ID, "Chest pain");

    expect(appt.slotId).toBe(SLOT_ID);
    expect(appt.note).toBe("Chest pain");
    expect(appt.patientId).toBe(PATIENT_ID);
    expect(appt.doctorId).toBe(DOCTOR_ID);
    expect(helpers.slots.get(SLOT_ID)?.status).toBe("booked");
    expect(helpers.appointments).toHaveLength(1);
  });

  it("books without a note when none is supplied (note stored as null)", async () => {
    helpers.setSlot({
      id: SLOT_ID,
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-07-01T10:00:00.000Z"),
      status: "open",
    });

    const appt = await svc.bookSlot(PATIENT_ID, SLOT_ID, undefined);
    expect(appt.note).toBeNull();
  });

  it("rejects double-booking the same slot — second call 409s, first remains the only Appointment", async () => {
    helpers.setSlot({
      id: SLOT_ID,
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-07-01T10:00:00.000Z"),
      status: "open",
    });

    await svc.bookSlot(PATIENT_ID, SLOT_ID, undefined);

    await expect(svc.bookSlot("user_patient_2", SLOT_ID, undefined)).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(svc.bookSlot("user_patient_2", SLOT_ID, undefined)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(helpers.appointments).toHaveLength(1);
    expect(helpers.appointments[0]?.patientId).toBe(PATIENT_ID);
  });

  it("409s on a slotId that doesn't resolve to a slot at all", async () => {
    await expect(svc.bookSlot(PATIENT_ID, "ghost-slot", undefined)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("409s on a slot that the editor never opened (already booked at first sight)", async () => {
    helpers.setSlot({
      id: SLOT_ID,
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-07-01T10:00:00.000Z"),
      status: "booked",
    });
    await expect(svc.bookSlot(PATIENT_ID, SLOT_ID, undefined)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe("AppointmentService.listForPatient", () => {
  it("splits the patient's appointments into upcoming/past with deterministic ordering", async () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    const helpers = fakeRepo();
    const svc = new AppointmentService(helpers.repo);

    helpers.setSlot({
      id: "slot_past",
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-06-13T10:00:00.000Z"),
      status: "open",
    });
    helpers.setSlot({
      id: "slot_soon",
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-06-15T10:00:00.000Z"),
      status: "open",
    });
    helpers.setSlot({
      id: "slot_later",
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-06-20T10:00:00.000Z"),
      status: "open",
    });

    await svc.bookSlot(PATIENT_ID, "slot_past", undefined);
    await svc.bookSlot(PATIENT_ID, "slot_later", undefined);
    await svc.bookSlot(PATIENT_ID, "slot_soon", undefined);

    const { upcoming, past } = await svc.listForPatient(PATIENT_ID, now);
    expect(upcoming.map((a) => a.slotId)).toEqual(["slot_soon", "slot_later"]);
    expect(past.map((a) => a.slotId)).toEqual(["slot_past"]);
  });

  it("returns empty arrays for a patient with no appointments", async () => {
    const helpers = fakeRepo();
    const svc = new AppointmentService(helpers.repo);
    const result = await svc.listForPatient("user_nobody", new Date("2026-06-14T12:00:00.000Z"));
    expect(result).toEqual({ upcoming: [], past: [] });
  });
});

describe("AppointmentService.listForDoctor", () => {
  it("returns the doctor's appointments split upcoming/past", async () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    const helpers = fakeRepo();
    const svc = new AppointmentService(helpers.repo);

    helpers.setSlot({
      id: "slot_future",
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-06-20T10:00:00.000Z"),
      status: "open",
    });
    helpers.setSlot({
      id: "slot_past",
      doctorId: DOCTOR_ID,
      startTime: new Date("2026-06-10T10:00:00.000Z"),
      status: "open",
    });
    await svc.bookSlot(PATIENT_ID, "slot_future", undefined);
    await svc.bookSlot(PATIENT_ID, "slot_past", undefined);

    const { upcoming, past } = await svc.listForDoctor(DOCTOR_USER_ID, now);
    expect(upcoming.map((a) => a.slotId)).toEqual(["slot_future"]);
    expect(past.map((a) => a.slotId)).toEqual(["slot_past"]);
  });

  it("returns empty for a doctor user id that owns no DoctorProfile", async () => {
    const helpers = fakeRepo();
    const svc = new AppointmentService(helpers.repo);
    const result = await svc.listForDoctor("user_someone_else", new Date());
    expect(result).toEqual({ upcoming: [], past: [] });
  });
});
