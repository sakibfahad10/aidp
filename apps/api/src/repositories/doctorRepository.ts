import {
  type City as PrismaCity,
  type DoctorStatus as PrismaDoctorStatus,
  type Specialty as PrismaSpecialty,
  prisma,
} from "@disease-prediction/db";
import type {
  DirectoryQuery,
  DoctorOnboardingDraft,
  DoctorOnboardingSubmit,
} from "@disease-prediction/shared";

// Shared and Prisma enums (`Specialty`, `City`, `DoctorStatus`) share identical
// string values, so a direct cast at the boundary is sound.

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

  /**
   * Public directory list. Always scoped to `verified` doctors (non-verified
   * never appear) and ordered by fee ascending — the has-open-slot ordering
   * factor lands with the availability slice.
   *
   * `specialty` matches when the doctor's `specialties` array contains it.
   * `city` is an exact enum match. `affiliation` is a case-insensitive
   * contains-match on free-text.
   */
  async findVerifiedDirectory(query: DirectoryQuery) {
    return prisma.doctorProfile.findMany({
      where: {
        status: "verified" as PrismaDoctorStatus,
        ...(query.specialty
          ? { specialties: { has: query.specialty as unknown as PrismaSpecialty } }
          : {}),
        ...(query.city ? { city: query.city as unknown as PrismaCity } : {}),
        ...(query.affiliation
          ? { affiliation: { contains: query.affiliation, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { feeBdt: "asc" },
      include: { user: { select: { name: true } } },
    });
  }

  /**
   * Public profile lookup. Scoped to `verified` at the query level so a
   * draft or pending profile with that id is indistinguishable from "no
   * such doctor" — non-verified profiles never leak.
   */
  async findPublicById(id: string) {
    return prisma.doctorProfile.findFirst({
      where: { id, status: "verified" as PrismaDoctorStatus },
      include: { user: { select: { name: true } } },
    });
  }
}

// `undefined` keys are treated by Prisma as "field not provided" in both create
// and update, so spreading the patch verbatim preserves the partial-update
// semantics the wizard relies on.
function toPrismaPatch(patch: Partial<DoctorOnboardingSubmit>) {
  return {
    phone: patch.phone,
    publicEmail: patch.publicEmail,
    bmdcNumber: patch.bmdcNumber,
    qualifications: patch.qualifications,
    specialties: patch.specialties as unknown as PrismaSpecialty[] | undefined,
    affiliation: patch.affiliation,
    city: patch.city as unknown as PrismaCity | undefined,
    experienceYears: patch.experienceYears,
    feeBdt: patch.feeBdt,
  };
}

export type DoctorProfileRow = Awaited<ReturnType<DoctorRepository["findByUserId"]>>;
export type DoctorProfileWithUserRow = Awaited<ReturnType<DoctorRepository["findPublicById"]>>;

export type DoctorRepositoryLike = {
  findByUserId(userId: string): Promise<DoctorProfileRow>;
  upsertDraft(userId: string, patch: DoctorOnboardingDraft): Promise<NonNullable<DoctorProfileRow>>;
  submit(userId: string, body: DoctorOnboardingSubmit): Promise<NonNullable<DoctorProfileRow>>;
  findVerifiedDirectory(
    query: DirectoryQuery,
  ): Promise<Awaited<ReturnType<DoctorRepository["findVerifiedDirectory"]>>>;
  findPublicById(id: string): Promise<DoctorProfileWithUserRow>;
};
