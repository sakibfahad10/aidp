import type { User } from "@disease-prediction/db";
import { Role } from "@disease-prediction/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middlewares/errorHandler";
import type { UserRepositoryLike } from "../repositories/userRepository";
import { UserService } from "./userService";

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-05-11T00:00:00.000Z");
  return {
    id: "user_1",
    email: "u@example.com",
    name: "Doc User",
    role: Role.DOCTOR as User["role"],
    patientCapability: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function fakeRepo(initial?: User): UserRepositoryLike {
  let user = initial ?? null;
  return {
    findById: vi.fn(async () => user),
    getRole: vi.fn(async () => (user?.role as Role | null) ?? null),
    setRole: vi.fn(async (_id: string, role: Role) => {
      if (!user) throw new Error("no user");
      user = {
        ...user,
        role: role as User["role"],
        patientCapability: role === Role.PATIENT ? true : user.patientCapability,
      };
      return user;
    }),
    setPatientCapability: vi.fn(async (_id: string, value: boolean) => {
      if (!user) throw new Error("no user");
      user = { ...user, patientCapability: value };
      return user;
    }),
  };
}

describe("UserService.getCurrentUser", () => {
  it("returns the user shaped as CurrentUserResponse with patientCapability", async () => {
    const repo = fakeRepo(makeUser({ patientCapability: true }));
    const svc = new UserService(repo);
    const me = await svc.getCurrentUser("user_1");
    expect(me).toMatchObject({
      id: "user_1",
      role: Role.DOCTOR,
      patientCapability: true,
    });
  });

  it("404s when the user is missing", async () => {
    const repo = fakeRepo();
    const svc = new UserService(repo);
    await expect(svc.getCurrentUser("nope")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("UserService.setRole", () => {
  it("promotes a fresh user to PATIENT and turns on patient capability", async () => {
    const repo = fakeRepo(makeUser({ role: null, patientCapability: false }));
    const svc = new UserService(repo);
    const me = await svc.setRole("user_1", Role.PATIENT);
    expect(me.role).toBe(Role.PATIENT);
    expect(me.patientCapability).toBe(true);
  });

  it("sets DOCTOR without granting patient capability", async () => {
    const repo = fakeRepo(makeUser({ role: null, patientCapability: false }));
    const svc = new UserService(repo);
    const me = await svc.setRole("user_1", Role.DOCTOR);
    expect(me.role).toBe(Role.DOCTOR);
    expect(me.patientCapability).toBe(false);
  });
});

describe("UserService.enablePatientCapability", () => {
  let repo: UserRepositoryLike;

  beforeEach(() => {
    repo = fakeRepo(makeUser({ role: Role.DOCTOR, patientCapability: false }));
  });

  it("flips a DOCTOR's patient capability from false to true", async () => {
    const svc = new UserService(repo);
    const me = await svc.enablePatientCapability("user_1");
    expect(me.role).toBe(Role.DOCTOR);
    expect(me.patientCapability).toBe(true);
    expect(repo.setPatientCapability).toHaveBeenCalledWith("user_1", true);
  });

  it("is idempotent — re-calling on a doctor already opted in is a no-op write", async () => {
    repo = fakeRepo(makeUser({ role: Role.DOCTOR, patientCapability: true }));
    const svc = new UserService(repo);
    const me = await svc.enablePatientCapability("user_1");
    expect(me.patientCapability).toBe(true);
    expect(repo.setPatientCapability).not.toHaveBeenCalled();
  });

  it("403s a PATIENT — they cannot become a doctor through this endpoint", async () => {
    repo = fakeRepo(makeUser({ role: Role.PATIENT, patientCapability: true }));
    const svc = new UserService(repo);
    await expect(svc.enablePatientCapability("user_1")).rejects.toBeInstanceOf(AppError);
    await expect(svc.enablePatientCapability("user_1")).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.setPatientCapability).not.toHaveBeenCalled();
  });

  it("403s a user who has not picked a role yet", async () => {
    repo = fakeRepo(makeUser({ role: null, patientCapability: false }));
    const svc = new UserService(repo);
    await expect(svc.enablePatientCapability("user_1")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("404s when the user does not exist", async () => {
    repo = fakeRepo();
    const svc = new UserService(repo);
    await expect(svc.enablePatientCapability("missing")).rejects.toMatchObject({ statusCode: 404 });
  });
});
