import {
  type City,
  type DoctorOnboardingDraft,
  type DoctorOnboardingSubmit,
  type DoctorProfileResponse,
  DoctorStatus,
  type DoctorStatus as SharedDoctorStatus,
  type Specialty,
} from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import {
  type DoctorProfileRow,
  DoctorRepository,
  type DoctorRepositoryLike,
} from "../repositories/doctorRepository";

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

function toResponse(row: NonNullable<DoctorProfileRow>): DoctorProfileResponse {
  return {
    id: row.id,
    userId: row.userId,
    phone: row.phone,
    publicEmail: row.publicEmail,
    bmdcNumber: row.bmdcNumber,
    qualifications: row.qualifications,
    specialties: row.specialties as unknown as Specialty[],
    affiliation: row.affiliation,
    city: row.city as unknown as City | null,
    experienceYears: row.experienceYears,
    feeBdt: row.feeBdt,
    status: row.status as unknown as SharedDoctorStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DoctorService {
  constructor(private readonly repo: DoctorRepositoryLike = new DoctorRepository()) {}

  async getByUserId(userId: string): Promise<DoctorProfileResponse | null> {
    const row = await this.repo.findByUserId(userId);
    return row ? toResponse(row) : null;
  }

  async saveDraft(userId: string, patch: DoctorOnboardingDraft): Promise<DoctorProfileResponse> {
    try {
      const row = await this.repo.upsertDraft(userId, patch);
      return toResponse(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new AppError(409, "BMDC number is already registered");
      }
      throw err;
    }
  }

  async submit(userId: string, body: DoctorOnboardingSubmit): Promise<DoctorProfileResponse> {
    try {
      const row = await this.repo.submit(userId, body);
      if ((row.status as unknown as SharedDoctorStatus) !== DoctorStatus.VERIFIED) {
        // The repository sets `verified`; this is a belt-and-braces guard
        // against a future migration drift.
        throw new AppError(500, "Submitted profile did not reach verified state");
      }
      return toResponse(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new AppError(409, "BMDC number is already registered");
      }
      throw err;
    }
  }
}
