import {
  type City as PrismaCity,
  type DoctorStatus as PrismaDoctorStatus,
  type Specialty as PrismaSpecialty,
  prisma,
} from "@disease-prediction/db";
import type {
  City,
  DirectoryQuery,
  DoctorOnboardingDraft,
  DoctorOnboardingSubmit,
  Specialty,
} from "@disease-prediction/shared";

// Shared and Prisma enums (`Specialty`, `City`, `DoctorStatus`) share identical
// string values, so a direct cast at the boundary is sound.

/**
 * Projection consumed by the suggestion matcher — collapses the open-slot
 * relation down to a precomputed boolean so the matcher stays pure and the
 * over-the-wire row shape lines up with `DoctorSuggestion` in shared.
 */
export interface SuggestionCandidateRow {
  id: string;
  userId: string;
  name: string | null;
  specialties: Specialty[];
  affiliation: string | null;
  city: City | null;
  experienceYears: number | null;
  feeBdt: number | null;
  hasOpenSlot: boolean;
}

/**
 * Row shape returned by the directory + public-profile lookups. Always carries
 * the doctor's currently `open` slots so callers can show bookability and so
 * the directory can be ordered by `has-open-slot DESC, feeBdt ASC`.
 */
export interface PublicDoctorRow {
  id: string;
  userId: string;
  name: string | null;
  publicEmail: string | null;
  qualifications: string | null;
  specialties: Specialty[];
  affiliation: string | null;
  city: City | null;
  experienceYears: number | null;
  feeBdt: number | null;
  openSlots: { id: string; startTime: Date }[];
}

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
   * Public directory listing — verified doctors only, ordered by
   * `has-open-slot DESC, feeBdt ASC` so bookable, cheaper doctors surface
   * first. The has-open-slot factor is materialized here in JS rather than
   * with a SQL window function: Prisma doesn't support ordering by a related
   * count on `findMany`, and the directory result set is small enough that
   * the post-sort is negligible.
   *
   * `specialty` matches when the doctor's `specialties` array contains it.
   * `city` is an exact enum match. `affiliation` is a case-insensitive
   * contains-match on free-text.
   */
  async findVerifiedDirectory(query: DirectoryQuery): Promise<PublicDoctorRow[]> {
    const rows = await prisma.doctorProfile.findMany({
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
      include: {
        user: { select: { name: true } },
        slots: {
          where: { status: "open" },
          orderBy: { startTime: "asc" },
          select: { id: true, startTime: true },
        },
      },
    });
    return rows.map(toPublicRow).sort(compareForDirectory);
  }

  /**
   * Verified-doctor candidates for the AI suggestion matcher. We project to
   * the matcher's `SuggestionCandidate` shape here (precomputed `hasOpenSlot`,
   * no per-slot detail) so the matcher can stay pure and database-free.
   *
   * Scoped to `status: verified` at the query level — non-verified rows are
   * never considered as suggestions.
   */
  async findVerifiedForSuggestions(): Promise<SuggestionCandidateRow[]> {
    const rows = await prisma.doctorProfile.findMany({
      where: { status: "verified" as PrismaDoctorStatus },
      include: {
        user: { select: { name: true } },
        slots: { where: { status: "open" }, select: { id: true }, take: 1 },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      specialties: row.specialties as unknown as Specialty[],
      affiliation: row.affiliation,
      city: row.city as unknown as City | null,
      experienceYears: row.experienceYears,
      feeBdt: row.feeBdt,
      hasOpenSlot: row.slots.length > 0,
    }));
  }

  /**
   * Public profile lookup. Scoped to `verified` at the query level so a
   * draft or pending profile with that id is indistinguishable from "no
   * such doctor" — non-verified profiles never leak.
   */
  async findPublicById(id: string): Promise<PublicDoctorRow | null> {
    const row = await prisma.doctorProfile.findFirst({
      where: { id, status: "verified" as PrismaDoctorStatus },
      include: {
        user: { select: { name: true } },
        slots: {
          where: { status: "open" },
          orderBy: { startTime: "asc" },
          select: { id: true, startTime: true },
        },
      },
    });
    return row ? toPublicRow(row) : null;
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

export type DoctorRepositoryLike = {
  findByUserId(userId: string): Promise<DoctorProfileRow>;
  upsertDraft(userId: string, patch: DoctorOnboardingDraft): Promise<NonNullable<DoctorProfileRow>>;
  submit(userId: string, body: DoctorOnboardingSubmit): Promise<NonNullable<DoctorProfileRow>>;
  findVerifiedDirectory(query: DirectoryQuery): Promise<PublicDoctorRow[]>;
  findPublicById(id: string): Promise<PublicDoctorRow | null>;
  findVerifiedForSuggestions(): Promise<SuggestionCandidateRow[]>;
};

function toPublicRow(row: {
  id: string;
  userId: string;
  publicEmail: string | null;
  qualifications: string | null;
  specialties: PrismaSpecialty[];
  affiliation: string | null;
  city: PrismaCity | null;
  experienceYears: number | null;
  feeBdt: number | null;
  user: { name: string | null };
  slots: { id: string; startTime: Date }[];
}): PublicDoctorRow {
  return {
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    publicEmail: row.publicEmail,
    qualifications: row.qualifications,
    specialties: row.specialties as unknown as Specialty[],
    affiliation: row.affiliation,
    city: row.city as unknown as City | null,
    experienceYears: row.experienceYears,
    feeBdt: row.feeBdt,
    openSlots: row.slots,
  };
}

/** Directory order: `has-open-slot DESC, feeBdt ASC`. Exported for tests. */
export function compareForDirectory(a: PublicDoctorRow, b: PublicDoctorRow): number {
  const aBookable = a.openSlots.length > 0 ? 1 : 0;
  const bBookable = b.openSlots.length > 0 ? 1 : 0;
  if (aBookable !== bBookable) return bBookable - aBookable;
  const aFee = a.feeBdt ?? Number.POSITIVE_INFINITY;
  const bFee = b.feeBdt ?? Number.POSITIVE_INFINITY;
  return aFee - bFee;
}
