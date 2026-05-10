import {
  type City as PrismaCity,
  type DoctorStatus as PrismaDoctorStatus,
  type Specialty as PrismaSpecialty,
  prisma,
} from "@disease-prediction/db";
import type {
  City,
  DoctorOnboardingDraft,
  DoctorOnboardingSubmit,
  DoctorStatus,
  Specialty,
} from "@disease-prediction/shared";

// Prisma enums and shared enums share identical string values, so a direct
// cast at the boundary is sound.

export class DoctorRepository {
  async findByUserId(userId: string) {
    return prisma.doctorProfile.findUnique({ where: { userId } });
  }

  /**
   * Create-or-merge the doctor's resumable draft. Only fields present on
   * `patch` are written, so a wizard step can save just what it owns without
   * clobbering values entered earlier.
   */
  async upsertDraft(userId: string, patch: DoctorOnboardingDraft) {
    const data = toPrismaPatch(patch);
    return prisma.doctorProfile.upsert({
      where: { userId },
      create: { userId, ...data, status: "draft" as PrismaDoctorStatus },
      update: data,
    });
  }

  /** Submit a complete profile; transitions status `draft → verified` directly. */
  async submit(userId: string, body: DoctorOnboardingSubmit) {
    const data = toPrismaPatch(body);
    return prisma.doctorProfile.upsert({
      where: { userId },
      create: { userId, ...data, status: "verified" as PrismaDoctorStatus },
      update: { ...data, status: "verified" as PrismaDoctorStatus },
    });
  }
}

function toPrismaPatch(patch: Partial<DoctorOnboardingSubmit>) {
  const data: {
    phone?: string;
    publicEmail?: string;
    bmdcNumber?: string;
    qualifications?: string;
    specialties?: PrismaSpecialty[];
    affiliation?: string;
    city?: PrismaCity;
    experienceYears?: number;
    feeBdt?: number;
  } = {};
  if (patch.phone !== undefined) data.phone = patch.phone;
  if (patch.publicEmail !== undefined) data.publicEmail = patch.publicEmail;
  if (patch.bmdcNumber !== undefined) data.bmdcNumber = patch.bmdcNumber;
  if (patch.qualifications !== undefined) data.qualifications = patch.qualifications;
  if (patch.specialties !== undefined) {
    data.specialties = patch.specialties as unknown as PrismaSpecialty[];
  }
  if (patch.affiliation !== undefined) data.affiliation = patch.affiliation;
  if (patch.city !== undefined) data.city = patch.city as unknown as PrismaCity;
  if (patch.experienceYears !== undefined) data.experienceYears = patch.experienceYears;
  if (patch.feeBdt !== undefined) data.feeBdt = patch.feeBdt;
  return data;
}

export type DoctorProfileRow = Awaited<ReturnType<DoctorRepository["findByUserId"]>>;

export type DoctorRepositoryLike = {
  findByUserId(userId: string): Promise<DoctorProfileRow>;
  upsertDraft(userId: string, patch: DoctorOnboardingDraft): Promise<NonNullable<DoctorProfileRow>>;
  submit(userId: string, body: DoctorOnboardingSubmit): Promise<NonNullable<DoctorProfileRow>>;
};

// Re-export shared types for callers (kept here so the surrounding modules
// don't accidentally depend on Prisma's generated enum types).
export type { City, DoctorStatus, Specialty };
