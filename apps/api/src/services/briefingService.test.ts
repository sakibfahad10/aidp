import { type HealthProfile, RiskLevel } from "@disease-prediction/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middlewares/errorHandler";
import type {
  AppointmentRepositoryLike,
  AppointmentRow,
  BookingOutcome,
} from "../repositories/appointmentRepository";
import type { HealthProfileRepositoryLike } from "../repositories/healthProfileRepository";
import type { PredictionRepositoryLike } from "../repositories/predictionRepository";
import type { BriefingInputPrediction } from "./briefingProjection";
import { BriefingService } from "./briefingService";

const DOCTOR_USER_ID = "user_doctor_1";
const PATIENT_ID = "user_patient_1";
const APPT_ID = "appt_1";

function makeRow(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
  return {
    id: APPT_ID,
    patientId: PATIENT_ID,
    patientName: "Alice Johnson",
    doctorId: "doc_1",
    doctorUserId: DOCTOR_USER_ID,
    doctorName: "Dr Test",
    slotId: "slot_1",
    slotStartTime: new Date("2026-07-01T10:00:00.000Z"),
    note: "Chest pain at night",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
  };
}

function fakeAppointmentRepo(rows: AppointmentRow[]): AppointmentRepositoryLike & {
  findByIdForDoctorUserId: ReturnType<typeof vi.fn>;
} {
  return {
    bookSlotTransaction: vi.fn(async (): Promise<BookingOutcome> => ({ error: "slot-not-open" })),
    listForPatient: vi.fn(async () => []),
    listForDoctorUserId: vi.fn(async () => []),
    findByIdForDoctorUserId: vi.fn(async (id, doctorUserId) => {
      return rows.find((r) => r.id === id && r.doctorUserId === doctorUserId) ?? null;
    }),
  };
}

function fakeProfileRepo(profile: HealthProfile | null): HealthProfileRepositoryLike {
  return { findByUserId: vi.fn(async () => profile) };
}

function fakePredictionRepo(
  predictions: BriefingInputPrediction[],
): PredictionRepositoryLike & { listRecentForUser: ReturnType<typeof vi.fn> } {
  return {
    listRecentForUser: vi.fn(async (_userId: string, limit: number) => predictions.slice(0, limit)),
  };
}

describe("BriefingService.getForDoctor", () => {
  let row: AppointmentRow;
  let apptRepo: ReturnType<typeof fakeAppointmentRepo>;
  let profileRepo: HealthProfileRepositoryLike;
  let predictionRepo: ReturnType<typeof fakePredictionRepo>;
  let svc: BriefingService;

  beforeEach(() => {
    row = makeRow();
    apptRepo = fakeAppointmentRepo([row]);
    profileRepo = fakeProfileRepo({
      age: 42,
      gender: "female",
      bloodType: "O+",
      conditions: ["asthma"],
      medications: ["albuterol"],
      allergies: [],
      editedFields: [],
    });
    predictionRepo = fakePredictionRepo([
      {
        id: "p1",
        createdAt: "2026-06-12T08:00:00.000Z",
        inputType: "symptom",
        riskLevel: RiskLevel.HIGH,
        summary: "Possible cardiac event",
      },
    ]);
    svc = new BriefingService(apptRepo, profileRepo, predictionRepo);
  });

  it("returns a briefing assembled from the appointment, profile, and recent predictions", async () => {
    const briefing = await svc.getForDoctor(DOCTOR_USER_ID, APPT_ID);

    expect(briefing.appointmentId).toBe(APPT_ID);
    expect(briefing.patientId).toBe(PATIENT_ID);
    expect(briefing.patientName).toBe("Alice Johnson");
    expect(briefing.slotStartTime).toBe("2026-07-01T10:00:00.000Z");
    expect(briefing.note).toBe("Chest pain at night");
    expect(briefing.profile.age).toBe(42);
    expect(briefing.profile.conditions).toEqual(["asthma"]);
    expect(briefing.recentPredictions).toHaveLength(1);
    expect(briefing.recentPredictions[0]?.id).toBe("p1");
    expect(briefing.summary).toContain("Alice Johnson");
  });

  it("asks the prediction repository for the most recent 5 only", async () => {
    await svc.getForDoctor(DOCTOR_USER_ID, APPT_ID);
    expect(predictionRepo.listRecentForUser).toHaveBeenCalledWith(PATIENT_ID, 5);
  });

  it("404s when the appointment does not exist", async () => {
    await expect(svc.getForDoctor(DOCTOR_USER_ID, "ghost-appt")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("404s when the appointment belongs to a different doctor (no leakage)", async () => {
    await expect(svc.getForDoctor("user_other_doctor", APPT_ID)).rejects.toBeInstanceOf(AppError);
    await expect(svc.getForDoctor("user_other_doctor", APPT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("falls back to an empty profile when the patient has no HealthProfile row yet", async () => {
    const svcEmpty = new BriefingService(apptRepo, fakeProfileRepo(null), fakePredictionRepo([]));
    const briefing = await svcEmpty.getForDoctor(DOCTOR_USER_ID, APPT_ID);
    expect(briefing.profile.age).toBeNull();
    expect(briefing.profile.conditions).toEqual([]);
    expect(briefing.summary).toContain("No standing health facts on file");
  });

  it("renders an empty recentPredictions list when the patient has no predictions", async () => {
    const svcNoPred = new BriefingService(apptRepo, profileRepo, fakePredictionRepo([]));
    const briefing = await svcNoPred.getForDoctor(DOCTOR_USER_ID, APPT_ID);
    expect(briefing.recentPredictions).toEqual([]);
    expect(briefing.summary).toContain("No recent predictions on file");
  });
});
