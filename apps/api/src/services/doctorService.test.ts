import {
  City,
  type DirectoryQuery,
  type DoctorOnboardingDraft,
  type DoctorOnboardingSubmit,
  DoctorStatus,
  Specialty,
} from "@disease-prediction/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middlewares/errorHandler";
import { compareForDirectory, type PublicDoctorRow } from "../repositories/doctorRepository";
import { DoctorService } from "./doctorService";

type Stored = {
  id: string;
  userId: string;
  phone: string | null;
  publicEmail: string | null;
  bmdcNumber: string | null;
  qualifications: string | null;
  specialties: Specialty[];
  affiliation: string | null;
  city: City | null;
  experienceYears: number | null;
  feeBdt: number | null;
  status: DoctorStatus;
  userName: string | null;
  openSlots: { id: string; startTime: Date }[];
  createdAt: Date;
  updatedAt: Date;
};

function fakeRepo() {
  const byUser = new Map<string, Stored>();
  const seenBmdc = new Set<string>();

  function toPublicRow(s: Stored): PublicDoctorRow {
    return {
      id: s.id,
      userId: s.userId,
      name: s.userName,
      publicEmail: s.publicEmail,
      qualifications: s.qualifications,
      specialties: s.specialties,
      affiliation: s.affiliation,
      city: s.city,
      experienceYears: s.experienceYears,
      feeBdt: s.feeBdt,
      openSlots: s.openSlots,
    };
  }

  const repo = {
    findByUserId: vi.fn(async (userId: string) => byUser.get(userId) ?? null),
    upsertDraft: vi.fn(async (userId: string, patch: DoctorOnboardingDraft) => {
      const existing = byUser.get(userId);
      const now = new Date();
      if (patch.bmdcNumber && patch.bmdcNumber !== existing?.bmdcNumber) {
        if (seenBmdc.has(patch.bmdcNumber)) {
          throw Object.assign(new Error("unique"), { code: "P2002" });
        }
      }
      const next: Stored = {
        id: existing?.id ?? `doc_${userId}`,
        userId,
        phone: patch.phone ?? existing?.phone ?? null,
        publicEmail: patch.publicEmail ?? existing?.publicEmail ?? null,
        bmdcNumber: patch.bmdcNumber ?? existing?.bmdcNumber ?? null,
        qualifications: patch.qualifications ?? existing?.qualifications ?? null,
        specialties: patch.specialties ?? existing?.specialties ?? [],
        affiliation: patch.affiliation ?? existing?.affiliation ?? null,
        city: patch.city ?? existing?.city ?? null,
        experienceYears: patch.experienceYears ?? existing?.experienceYears ?? null,
        feeBdt: patch.feeBdt ?? existing?.feeBdt ?? null,
        status: existing?.status ?? DoctorStatus.DRAFT,
        userName: existing?.userName ?? null,
        openSlots: existing?.openSlots ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      byUser.set(userId, next);
      if (next.bmdcNumber) seenBmdc.add(next.bmdcNumber);
      return next;
    }),
    submit: vi.fn(async (userId: string, body: DoctorOnboardingSubmit) => {
      const existing = byUser.get(userId);
      if (existing?.bmdcNumber !== body.bmdcNumber && seenBmdc.has(body.bmdcNumber)) {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
      const now = new Date();
      const next: Stored = {
        id: existing?.id ?? `doc_${userId}`,
        userId,
        ...body,
        status: DoctorStatus.VERIFIED,
        userName: existing?.userName ?? null,
        openSlots: existing?.openSlots ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      byUser.set(userId, next);
      seenBmdc.add(body.bmdcNumber);
      return next;
    }),
    findVerifiedDirectory: vi.fn(async (query: DirectoryQuery) => {
      const affil = query.affiliation?.toLowerCase();
      const filtered = [...byUser.values()].filter((s) => {
        if (s.status !== DoctorStatus.VERIFIED) return false;
        if (query.specialty && !s.specialties.includes(query.specialty)) return false;
        if (query.city && s.city !== query.city) return false;
        if (affil && !(s.affiliation ?? "").toLowerCase().includes(affil)) return false;
        return true;
      });
      return filtered.map(toPublicRow).sort(compareForDirectory);
    }),
    findPublicById: vi.fn(async (id: string) => {
      const found = [...byUser.values()].find((s) => s.id === id);
      if (!found) return null;
      if (found.status !== DoctorStatus.VERIFIED) return null;
      return toPublicRow(found);
    }),
  };
  return { repo, byUser, seenBmdc };
}

function seed(byUser: Map<string, Stored>, s: Partial<Stored> & { userId: string; id: string }) {
  const now = new Date("2026-05-10T00:00:00.000Z");
  byUser.set(s.userId, {
    id: s.id,
    userId: s.userId,
    phone: s.phone ?? "+8801712345678",
    publicEmail: s.publicEmail ?? "dr@example.com",
    bmdcNumber: s.bmdcNumber ?? `A-${s.id}`,
    qualifications: s.qualifications ?? "MBBS",
    specialties: s.specialties ?? [Specialty.GeneralMedicine],
    affiliation: s.affiliation ?? null,
    city: s.city ?? null,
    experienceYears: s.experienceYears ?? null,
    feeBdt: s.feeBdt ?? null,
    status: s.status ?? DoctorStatus.VERIFIED,
    userName: s.userName ?? null,
    openSlots: s.openSlots ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

describe("DoctorService.getByUserId", () => {
  it("returns null when no profile exists yet", async () => {
    const { repo } = fakeRepo();
    const svc = new DoctorService(repo);
    expect(await svc.getByUserId("user_1")).toBeNull();
  });

  it("returns a serialized profile when one exists", async () => {
    const { repo, byUser } = fakeRepo();
    const now = new Date("2026-05-10T00:00:00.000Z");
    byUser.set("user_1", {
      id: "doc_user_1",
      userId: "user_1",
      phone: "+8801712345678",
      publicEmail: "p@example.com",
      bmdcNumber: "A-12345",
      qualifications: "MBBS",
      specialties: [Specialty.Cardiology],
      affiliation: "Square Hospital",
      city: City.Dhaka,
      experienceYears: 5,
      feeBdt: 1200,
      status: DoctorStatus.DRAFT,
      userName: null,
      openSlots: [],
      createdAt: now,
      updatedAt: now,
    });
    const svc = new DoctorService(repo);
    const profile = await svc.getByUserId("user_1");
    expect(profile).not.toBeNull();
    expect(profile?.bmdcNumber).toBe("A-12345");
    expect(profile?.status).toBe(DoctorStatus.DRAFT);
    expect(profile?.createdAt).toBe(now.toISOString());
  });
});

describe("DoctorService.saveDraft", () => {
  let svc: DoctorService;
  let repo: ReturnType<typeof fakeRepo>["repo"];

  beforeEach(() => {
    const fake = fakeRepo();
    repo = fake.repo;
    svc = new DoctorService(repo);
  });

  it("creates a draft profile on first save", async () => {
    const profile = await svc.saveDraft("user_1", { bmdcNumber: "A-12345" });
    expect(profile.status).toBe(DoctorStatus.DRAFT);
    expect(profile.bmdcNumber).toBe("A-12345");
    expect(repo.upsertDraft).toHaveBeenCalledOnce();
  });

  it("merges fields into an existing draft", async () => {
    await svc.saveDraft("user_1", { bmdcNumber: "A-12345" });
    const second = await svc.saveDraft("user_1", { city: City.Dhaka });
    expect(second.bmdcNumber).toBe("A-12345");
    expect(second.city).toBe(City.Dhaka);
  });

  it("rejects a duplicate BMDC number with a 409", async () => {
    await svc.saveDraft("user_1", { bmdcNumber: "A-12345" });
    await expect(svc.saveDraft("user_2", { bmdcNumber: "A-12345" })).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe("compareForDirectory (has-open-slot then fee asc)", () => {
  function row(id: string, feeBdt: number | null, openSlotCount: number): PublicDoctorRow {
    return {
      id,
      userId: `u_${id}`,
      name: id,
      publicEmail: null,
      qualifications: null,
      specialties: [],
      affiliation: null,
      city: null,
      experienceYears: null,
      feeBdt,
      openSlots: Array.from({ length: openSlotCount }, (_, i) => ({
        id: `${id}_slot_${i}`,
        startTime: new Date(`2026-06-15T0${i}:00:00.000Z`),
      })),
    };
  }

  it("places doctors with open slots ahead of those without — regardless of fee", () => {
    const cheaper = row("a", 500, 0);
    const bookable = row("b", 5000, 1);
    const sorted = [cheaper, bookable].sort(compareForDirectory);
    expect(sorted.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("breaks has-open-slot ties by fee ascending", () => {
    const expensive = row("a", 5000, 2);
    const cheap = row("b", 500, 1);
    const free = row("c", 0, 3);
    const sorted = [expensive, cheap, free].sort(compareForDirectory);
    expect(sorted.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("treats a null fee as +infinity (sinks to the bottom of its bucket)", () => {
    const nullFee = row("a", null, 1);
    const cheap = row("b", 100, 1);
    const sorted = [nullFee, cheap].sort(compareForDirectory);
    expect(sorted.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("DoctorService.submit", () => {
  const submission: DoctorOnboardingSubmit = {
    phone: "+8801712345678",
    publicEmail: "dr@example.com",
    bmdcNumber: "A-12345",
    qualifications: "MBBS, FCPS",
    specialties: [Specialty.Cardiology],
    affiliation: "Square Hospital",
    city: City.Dhaka,
    experienceYears: 10,
    feeBdt: 1500,
  };

  it("flips the profile from draft to verified on submit", async () => {
    const { repo } = fakeRepo();
    const svc = new DoctorService(repo);
    const profile = await svc.submit("user_1", submission);
    expect(profile.status).toBe(DoctorStatus.VERIFIED);
    expect(profile.bmdcNumber).toBe("A-12345");
    expect(repo.submit).toHaveBeenCalledWith("user_1", submission);
  });

  it("rejects a duplicate BMDC number with a 409", async () => {
    const { repo } = fakeRepo();
    const svc = new DoctorService(repo);
    await svc.submit("user_1", submission);
    await expect(
      svc.submit("user_2", { ...submission, publicEmail: "other@example.com" }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("DoctorService.listDirectory", () => {
  it("returns only verified doctors — drafts are filtered out", async () => {
    const { repo, byUser } = fakeRepo();
    seed(byUser, {
      id: "1",
      userId: "u1",
      specialties: [Specialty.Cardiology],
      city: City.Dhaka,
      feeBdt: 1500,
      userName: "Dr. A",
    });
    seed(byUser, {
      id: "2",
      userId: "u2",
      specialties: [Specialty.Cardiology],
      city: City.Dhaka,
      feeBdt: 800,
      status: DoctorStatus.DRAFT,
      userName: "Dr. B (draft)",
    });
    const svc = new DoctorService(repo);
    const list = await svc.listDirectory({});
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("Dr. A");
  });

  it("filters by specialty, city, and affiliation together", async () => {
    const { repo, byUser } = fakeRepo();
    seed(byUser, {
      id: "1",
      userId: "u1",
      specialties: [Specialty.Cardiology],
      city: City.Dhaka,
      affiliation: "Square Hospital",
      feeBdt: 1500,
    });
    seed(byUser, {
      id: "2",
      userId: "u2",
      specialties: [Specialty.Dermatology],
      city: City.Dhaka,
      affiliation: "Square Hospital",
      feeBdt: 1200,
    });
    seed(byUser, {
      id: "3",
      userId: "u3",
      specialties: [Specialty.Cardiology],
      city: City.Chattogram,
      affiliation: "Square Hospital",
      feeBdt: 1000,
    });
    seed(byUser, {
      id: "4",
      userId: "u4",
      specialties: [Specialty.Cardiology],
      city: City.Dhaka,
      affiliation: "Apollo",
      feeBdt: 900,
    });
    const svc = new DoctorService(repo);
    const list = await svc.listDirectory({
      specialty: Specialty.Cardiology,
      city: City.Dhaka,
      affiliation: "square",
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("1");
  });

  it("orders results by fee ascending when nobody has open slots", async () => {
    const { repo, byUser } = fakeRepo();
    seed(byUser, { id: "1", userId: "u1", feeBdt: 1500 });
    seed(byUser, { id: "2", userId: "u2", feeBdt: 500 });
    seed(byUser, { id: "3", userId: "u3", feeBdt: 1000 });
    const svc = new DoctorService(repo);
    const list = await svc.listDirectory({});
    expect(list.map((d) => d.feeBdt)).toEqual([500, 1000, 1500]);
  });

  it("never exposes login email, BMDC, or status in directory rows", async () => {
    const { repo, byUser } = fakeRepo();
    seed(byUser, { id: "1", userId: "u1", bmdcNumber: "A-99999", publicEmail: "p@x.com" });
    const svc = new DoctorService(repo);
    const list = await svc.listDirectory({});
    expect(list).toHaveLength(1);
    const row = list[0] as unknown as Record<string, unknown>;
    expect(row.bmdcNumber).toBeUndefined();
    expect(row.publicEmail).toBeUndefined();
    expect(row.status).toBeUndefined();
  });
});

describe("DoctorService.getPublicProfile", () => {
  it("returns the verified profile when found", async () => {
    const { repo, byUser } = fakeRepo();
    seed(byUser, {
      id: "doc_1",
      userId: "u1",
      specialties: [Specialty.Cardiology],
      affiliation: "Square Hospital",
      city: City.Dhaka,
      qualifications: "MBBS, FCPS",
      experienceYears: 10,
      feeBdt: 1500,
      publicEmail: "dr@example.com",
      userName: "Dr. Alice",
    });
    const svc = new DoctorService(repo);
    const profile = await svc.getPublicProfile("doc_1");
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe("Dr. Alice");
    expect(profile?.qualifications).toBe("MBBS, FCPS");
    expect(profile?.publicEmail).toBe("dr@example.com");
    expect(profile?.openSlots).toEqual([]);
  });

  it("serializes open slots as ISO strings", async () => {
    const { repo, byUser } = fakeRepo();
    const slotStart = new Date("2026-06-15T10:00:00.000Z");
    seed(byUser, {
      id: "doc_1",
      userId: "u1",
      openSlots: [{ id: "slot_a", startTime: slotStart }],
    });
    const svc = new DoctorService(repo);
    const profile = await svc.getPublicProfile("doc_1");
    expect(profile?.openSlots).toEqual([{ id: "slot_a", startTime: slotStart.toISOString() }]);
  });

  it("returns null for a non-verified profile", async () => {
    const { repo, byUser } = fakeRepo();
    seed(byUser, { id: "doc_2", userId: "u2", status: DoctorStatus.DRAFT });
    const svc = new DoctorService(repo);
    expect(await svc.getPublicProfile("doc_2")).toBeNull();
  });

  it("returns null when no profile with that id exists", async () => {
    const { repo } = fakeRepo();
    const svc = new DoctorService(repo);
    expect(await svc.getPublicProfile("unknown")).toBeNull();
  });
});
