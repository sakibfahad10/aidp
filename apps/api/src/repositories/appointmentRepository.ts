import { type Prisma, type SlotStatus as PrismaSlotStatus, prisma } from "@disease-prediction/db";
import type { Appointment } from "@disease-prediction/shared";

/**
 * Raw row shape the repository hands back — the slot's `startTime` and the
 * doctor's user id / name are joined in so the service can shape an
 * `Appointment` wire object without an extra round-trip.
 */
export interface AppointmentRow {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorUserId: string;
  doctorName: string | null;
  slotId: string;
  slotStartTime: Date;
  note: string | null;
  createdAt: Date;
}

/** Stable join + select shared by every list/lookup so the wire mapping has one shape to handle. */
const appointmentInclude = {
  slot: { select: { startTime: true } },
  patient: { select: { name: true } },
  doctor: { select: { userId: true, user: { select: { name: true } } } },
} as const;

type RawAppointment = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

function toRow(row: RawAppointment): AppointmentRow {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient.name,
    doctorId: row.doctorId,
    doctorUserId: row.doctor.userId,
    doctorName: row.doctor.user.name,
    slotId: row.slotId,
    slotStartTime: row.slot.startTime,
    note: row.note,
    createdAt: row.createdAt,
  };
}

export function appointmentRowToWire(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patientName,
    doctorId: row.doctorId,
    doctorUserId: row.doctorUserId,
    doctorName: row.doctorName,
    slotId: row.slotId,
    slotStartTime: row.slotStartTime.toISOString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Outcome of the booking transaction — either the freshly inserted `row`
 * mapped to `AppointmentRow`, or a `slot-not-open` sentinel the service
 * turns into a clean 409. The repository never throws on "slot already
 * taken"; Prisma error codes are caught here so no stack traces leak out.
 */
export type BookingOutcome = { row: AppointmentRow } | { error: "slot-not-open" };

/**
 * Repository for `Appointment`. The deep concern here is the **booking
 * transaction**: in one Postgres transaction, the slot is conditionally
 * flipped from `open` to `booked` and the Appointment is inserted. The
 * `slotId @unique` constraint on Appointment is the database-level
 * backstop against two transactions both passing the in-tx `open` check.
 */
export class AppointmentRepository {
  /**
   * Atomically book `slotId` for `patientId` with an optional `note`.
   *
   * Returns `{ row }` on success. Returns `{ error: "slot-not-open" }` if
   * the slot is missing, not open, or if a concurrent transaction beat us
   * to it (caught via Prisma P2002 on the Appointment.slotId unique index
   * or P2025 on the conditional update).
   */
  async bookSlotTransaction(
    patientId: string,
    slotId: string,
    note: string | null,
  ): Promise<BookingOutcome> {
    try {
      const row = await prisma.$transaction(async (tx) => {
        // Conditional update: only flip when the row exists and is still
        // `open`. Two concurrent transactions cannot both succeed — the
        // second one sees zero rows updated and throws P2025. The same
        // P2025 covers "slot id doesn't exist at all", so a separate
        // pre-read isn't needed.
        const slot = await tx.availabilitySlot.update({
          where: { id: slotId, status: "open" as PrismaSlotStatus },
          data: { status: "booked" as PrismaSlotStatus },
          select: { doctorId: true },
        });

        const created = await tx.appointment.create({
          data: { patientId, doctorId: slot.doctorId, slotId, note },
          include: appointmentInclude,
        });
        return toRow(created);
      });
      return { row };
    } catch (err) {
      if (isPrismaConflict(err)) return { error: "slot-not-open" };
      throw err;
    }
  }

  /** Patient's appointments (joined with slot + doctor for the wire shape). */
  async listForPatient(patientId: string): Promise<AppointmentRow[]> {
    const rows = await prisma.appointment.findMany({
      where: { patientId },
      include: appointmentInclude,
      orderBy: { slot: { startTime: "asc" } },
    });
    return rows.map(toRow);
  }

  /** Doctor's appointments, keyed by the doctor's *user id* (not DoctorProfile id). */
  async listForDoctorUserId(userId: string): Promise<AppointmentRow[]> {
    const rows = await prisma.appointment.findMany({
      where: { doctor: { userId } },
      include: appointmentInclude,
      orderBy: { slot: { startTime: "asc" } },
    });
    return rows.map(toRow);
  }
}

function isPrismaConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const code = (err as { code?: string }).code;
  // P2002: unique constraint violation (slotId @unique on Appointment).
  // P2025: record-to-update not found — either the slot id doesn't exist
  // or a concurrent tx already flipped the slot away from `open`.
  return code === "P2002" || code === "P2025";
}

export interface AppointmentRepositoryLike {
  bookSlotTransaction(
    patientId: string,
    slotId: string,
    note: string | null,
  ): Promise<BookingOutcome>;
  listForPatient(patientId: string): Promise<AppointmentRow[]>;
  listForDoctorUserId(userId: string): Promise<AppointmentRow[]>;
}
