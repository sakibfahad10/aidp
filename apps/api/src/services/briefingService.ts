import type { PatientBriefing } from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import {
  AppointmentRepository,
  type AppointmentRepositoryLike,
} from "../repositories/appointmentRepository";
import {
  HealthProfileRepository,
  type HealthProfileRepositoryLike,
} from "../repositories/healthProfileRepository";
import {
  PredictionRepository,
  type PredictionRepositoryLike,
} from "../repositories/predictionRepository";
import { buildPatientBriefing, RECENT_PREDICTION_LIMIT } from "./briefingProjection";

/**
 * Briefing service — composes three repositories into the read-time
 * projection that powers the doctor-dashboard briefing card.
 *
 * The deep work lives in `buildPatientBriefing` (pure, unit-tested); the
 * service is the thin assembly layer that loads the three inputs (the
 * appointment, the patient's `HealthProfile`, their five most recent
 * `Prediction`s) and hands them to the projection. No briefing is ever
 * stored — every call recomputes against the current DB state so the
 * briefing always reflects the patient's latest profile.
 */
export class BriefingService {
  constructor(
    private readonly appointments: AppointmentRepositoryLike = new AppointmentRepository(),
    private readonly profiles: HealthProfileRepositoryLike = new HealthProfileRepository(),
    private readonly predictions: PredictionRepositoryLike = new PredictionRepository(),
  ) {}

  /**
   * Build the briefing for `appointmentId`, scoped to the authenticated
   * doctor's `doctorUserId`. Throws 404 when the appointment doesn't
   * exist or is owned by a different doctor (same response either way
   * so a doctor can't probe other doctors' appointment ids).
   */
  async getForDoctor(doctorUserId: string, appointmentId: string): Promise<PatientBriefing> {
    const appt = await this.appointments.findByIdForDoctorUserId(appointmentId, doctorUserId);
    if (!appt) throw new AppError(404, "Appointment not found");

    const [profile, recentPredictions] = await Promise.all([
      this.profiles.findByUserId(appt.patientId),
      this.predictions.listRecentForUser(appt.patientId, RECENT_PREDICTION_LIMIT),
    ]);

    return buildPatientBriefing({
      appointment: {
        id: appt.id,
        patientId: appt.patientId,
        patientName: appt.patientName,
        slotStartTime: appt.slotStartTime.toISOString(),
        note: appt.note,
      },
      profile,
      recentPredictions,
    });
  }
}
