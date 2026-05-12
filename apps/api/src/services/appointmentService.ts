import type { Appointment, AppointmentListResponse } from "@disease-prediction/shared";
import { splitAppointmentsByTime } from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import {
  AppointmentRepository,
  type AppointmentRepositoryLike,
  appointmentRowToWire,
} from "../repositories/appointmentRepository";

/**
 * Appointment service — owns the booking transaction and the upcoming/past
 * split that powers both patient and doctor appointment views.
 *
 * The deep concern is `bookSlot`: the actual atomic flip + insert lives in
 * the repository so the service can stay test-friendly behind
 * `AppointmentRepositoryLike`. The 409 mapping for "slot not open" is
 * encoded here so controllers stay thin.
 */
export class AppointmentService {
  constructor(private readonly repo: AppointmentRepositoryLike = new AppointmentRepository()) {}

  /**
   * Patient books `slotId` with an optional `note`. Returns the inserted
   * `Appointment` on success; throws 409 if the slot is missing, already
   * booked, or lost to a concurrent transaction.
   */
  async bookSlot(
    patientId: string,
    slotId: string,
    note: string | undefined,
  ): Promise<Appointment> {
    const outcome = await this.repo.bookSlotTransaction(patientId, slotId, note ?? null);
    if ("error" in outcome) {
      throw new AppError(409, "Slot is no longer available");
    }
    return appointmentRowToWire(outcome.row);
  }

  /**
   * Patient view of their own appointments, split upcoming/past against
   * `now`. `now` is injectable so the controller can pin it once per
   * request (and so tests are deterministic).
   */
  async listForPatient(
    patientId: string,
    now: Date = new Date(),
  ): Promise<AppointmentListResponse> {
    const rows = await this.repo.listForPatient(patientId);
    return splitAppointmentsByTime(rows.map(appointmentRowToWire), now);
  }

  /**
   * Doctor view of their own appointments, keyed by the doctor's user id
   * (not the DoctorProfile id) so the controller can pass the Clerk
   * `userId` straight through without an extra lookup.
   */
  async listForDoctor(userId: string, now: Date = new Date()): Promise<AppointmentListResponse> {
    const rows = await this.repo.listForDoctorUserId(userId);
    return splitAppointmentsByTime(rows.map(appointmentRowToWire), now);
  }
}
