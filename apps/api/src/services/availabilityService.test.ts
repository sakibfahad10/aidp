import { SlotStatus } from "@disease-prediction/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middlewares/errorHandler";
import type {
  AvailabilityRepositoryLike,
  AvailabilitySlotRow,
} from "../repositories/availabilityRepository";
import { AvailabilityService } from "./availabilityService";

const DOCTOR_ID = "doc_1";
const USER_ID = "user_doctor_1";
const START_TIME = new Date("2026-06-15T09:00:00.000Z");

function fakeRepo(): {
  repo: AvailabilityRepositoryLike;
  store: Map<string, AvailabilitySlotRow>;
} {
  const store = new Map<string, AvailabilitySlotRow>();
  const key = (doctorId: string, startTime: Date) => `${doctorId}|${startTime.toISOString()}`;
  let nextId = 1;

  const repo: AvailabilityRepositoryLike = {
    findDoctorIdByUserId: vi.fn(async (userId: string) => (userId === USER_ID ? DOCTOR_ID : null)),
    findSlot: vi.fn(async (doctorId: string, startTime: Date) => {
      return store.get(key(doctorId, startTime)) ?? null;
    }),
    findById: vi.fn(async (id: string) => {
      for (const row of store.values()) if (row.id === id) return row;
      return null;
    }),
    create: vi.fn(async (doctorId: string, startTime: Date) => {
      const k = key(doctorId, startTime);
      if (store.has(k)) {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
      const now = new Date();
      const row: AvailabilitySlotRow = {
        id: `slot_${nextId++}`,
        doctorId,
        startTime,
        status: SlotStatus.OPEN,
        createdAt: now,
        updatedAt: now,
      };
      store.set(k, row);
      return row;
    }),
    deleteById: vi.fn(async (id: string) => {
      for (const [k, row] of store.entries()) {
        if (row.id === id) {
          store.delete(k);
          return;
        }
      }
    }),
    listOpenByDoctorId: vi.fn(async (doctorId: string) =>
      Array.from(store.values())
        .filter((s) => s.doctorId === doctorId && s.status === SlotStatus.OPEN)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    ),
    listByDoctorIdInRange: vi.fn(async (doctorId: string, from: Date, to: Date) =>
      Array.from(store.values())
        .filter(
          (s) =>
            s.doctorId === doctorId &&
            s.startTime.getTime() >= from.getTime() &&
            s.startTime.getTime() < to.getTime(),
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    ),
    bulkApply: vi.fn(async (doctorId: string, openTimes: Date[], closeTimes: Date[]) => {
      // create-if-absent (skip already-open/booked), then delete-if-open.
      for (const startTime of openTimes) {
        const k = key(doctorId, startTime);
        if (store.has(k)) continue;
        const now = new Date();
        store.set(k, {
          id: `slot_${nextId++}`,
          doctorId,
          startTime,
          status: SlotStatus.OPEN,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const startTime of closeTimes) {
        const k = key(doctorId, startTime);
        const row = store.get(k);
        if (row && row.status === SlotStatus.OPEN) store.delete(k);
      }
      return Array.from(store.values())
        .filter((s) => s.doctorId === doctorId && s.status === SlotStatus.OPEN)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }),
  };
  return { repo, store };
}

describe("AvailabilityService.toggle", () => {
  let svc: AvailabilityService;
  let repo: AvailabilityRepositoryLike;
  let store: Map<string, AvailabilitySlotRow>;

  beforeEach(() => {
    const fake = fakeRepo();
    repo = fake.repo;
    store = fake.store;
    svc = new AvailabilityService(repo);
  });

  it("materializes a fresh open AvailabilitySlot when no row exists at that time", async () => {
    const result = await svc.toggle(USER_ID, START_TIME);
    expect(result.action).toBe("created");
    expect(result.slot).not.toBeNull();
    expect(result.slot?.doctorId).toBe(DOCTOR_ID);
    expect(result.slot?.startTime).toBe(START_TIME.toISOString());
    expect(result.slot?.status).toBe(SlotStatus.OPEN);
    expect(store.size).toBe(1);
  });

  it("removes a still-open slot when toggled a second time", async () => {
    await svc.toggle(USER_ID, START_TIME);
    expect(store.size).toBe(1);
    const result = await svc.toggle(USER_ID, START_TIME);
    expect(result.action).toBe("removed");
    expect(result.slot).toBeNull();
    expect(store.size).toBe(0);
  });

  it("refuses to remove a booked slot and leaves it untouched", async () => {
    await svc.toggle(USER_ID, START_TIME);
    const stored = Array.from(store.values())[0];
    if (!stored) throw new Error("expected a stored slot");
    stored.status = SlotStatus.BOOKED;

    await expect(svc.toggle(USER_ID, START_TIME)).rejects.toBeInstanceOf(AppError);
    await expect(svc.toggle(USER_ID, START_TIME)).rejects.toMatchObject({ statusCode: 409 });
    expect(store.size).toBe(1);
    expect(Array.from(store.values())[0]?.status).toBe(SlotStatus.BOOKED);
  });

  it("rejects toggling when the user has no doctor profile", async () => {
    await expect(svc.toggle("user_patient", START_TIME)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe("AvailabilityService.listOpenForDoctor", () => {
  it("returns the doctor's open slots in chronological order", async () => {
    const { repo } = fakeRepo();
    const svc = new AvailabilityService(repo);
    const later = new Date("2026-06-15T15:00:00.000Z");
    await svc.toggle(USER_ID, later);
    await svc.toggle(USER_ID, START_TIME);

    const slots = await svc.listOpenForDoctor(DOCTOR_ID);
    expect(slots.map((s) => s.startTime)).toEqual([START_TIME.toISOString(), later.toISOString()]);
    for (const slot of slots) expect(slot.status).toBe(SlotStatus.OPEN);
  });

  it("omits booked slots from the public listing", async () => {
    const { repo, store } = fakeRepo();
    const svc = new AvailabilityService(repo);
    await svc.toggle(USER_ID, START_TIME);
    const stored = Array.from(store.values())[0];
    if (!stored) throw new Error("expected a stored slot");
    stored.status = SlotStatus.BOOKED;

    expect(await svc.listOpenForDoctor(DOCTOR_ID)).toEqual([]);
  });
});

describe("AvailabilityService.bulkSet", () => {
  const t = (iso: string) => new Date(iso);
  const A = t("2026-06-15T09:00:00.000Z");
  const B = t("2026-06-15T10:00:00.000Z");
  const C = t("2026-06-15T11:00:00.000Z");

  it("opens all missing moments and returns them sorted", async () => {
    const { repo } = fakeRepo();
    const svc = new AvailabilityService(repo);

    const slots = await svc.bulkSet(USER_ID, [B, A, C], []);
    expect(slots.map((s) => s.startTime)).toEqual([
      A.toISOString(),
      B.toISOString(),
      C.toISOString(),
    ]);
    for (const s of slots) expect(s.status).toBe(SlotStatus.OPEN);
  });

  it("skips already-open and booked moments on open, never duplicating or disturbing them", async () => {
    const { repo, store } = fakeRepo();
    const svc = new AvailabilityService(repo);
    await svc.bulkSet(USER_ID, [A], []); // A already open
    const a = Array.from(store.values()).find((s) => s.startTime.getTime() === A.getTime());
    if (!a) throw new Error("expected slot A");
    // make B booked
    await svc.bulkSet(USER_ID, [B], []);
    const b = Array.from(store.values()).find((s) => s.startTime.getTime() === B.getTime());
    if (!b) throw new Error("expected slot B");
    b.status = SlotStatus.BOOKED;

    await svc.bulkSet(USER_ID, [A, B, C], []);
    expect(store.size).toBe(3); // A (still its original row), B (booked), C (new)
    expect(Array.from(store.values()).find((s) => s.id === a.id)).toBeTruthy();
    expect(b.status).toBe(SlotStatus.BOOKED);
  });

  it("closes still-open moments and leaves booked / missing untouched", async () => {
    const { repo, store } = fakeRepo();
    const svc = new AvailabilityService(repo);
    await svc.bulkSet(USER_ID, [A, B], []);
    const b = Array.from(store.values()).find((s) => s.startTime.getTime() === B.getTime());
    if (!b) throw new Error("expected slot B");
    b.status = SlotStatus.BOOKED;

    // Close A (open), B (booked → kept), C (missing → no-op).
    const remaining = await svc.bulkSet(USER_ID, [], [A, B, C]);
    expect(remaining).toEqual([]); // only B remains and it's booked, not open
    expect(store.size).toBe(1);
    expect(Array.from(store.values())[0]?.status).toBe(SlotStatus.BOOKED);
  });

  it("applies opens and closes together in one call", async () => {
    const { repo } = fakeRepo();
    const svc = new AvailabilityService(repo);
    await svc.bulkSet(USER_ID, [A, B], []);
    const slots = await svc.bulkSet(USER_ID, [C], [A]);
    expect(slots.map((s) => s.startTime)).toEqual([B.toISOString(), C.toISOString()]);
  });

  it("rejects when the user has no doctor profile", async () => {
    const { repo } = fakeRepo();
    const svc = new AvailabilityService(repo);
    await expect(svc.bulkSet("user_patient", [A], [])).rejects.toMatchObject({ statusCode: 403 });
  });
});
