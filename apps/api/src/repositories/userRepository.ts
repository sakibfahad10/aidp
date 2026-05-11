import { type Role as PrismaRole, prisma, type User } from "@disease-prediction/db";
import { Role } from "@disease-prediction/shared";

// Shared `Role` and Prisma `Role` are distinct types but share identical string
// values, so a direct cast at the boundary is sound.

/**
 * Minimal repository surface UserService depends on. Lets tests inject a
 * fake without dragging Prisma along, mirroring `DoctorRepositoryLike`.
 */
export interface UserRepositoryLike {
  findById(id: string): Promise<User | null>;
  getRole(id: string): Promise<Role | null>;
  setRole(id: string, role: Role): Promise<User>;
  setPatientCapability(id: string, value: boolean): Promise<User>;
}

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async getRole(id: string): Promise<Role | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    return (user?.role ?? null) as Role | null;
  }

  async setRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: {
        role: role as PrismaRole,
        // PATIENT role implies patient capability — match the webhook policy
        // so the gate and the webhook never disagree. DOCTOR keeps whatever
        // capability flag was already there (defaults to false on create).
        ...(role === Role.PATIENT ? { patientCapability: true } : {}),
      },
    });
  }

  async setPatientCapability(id: string, value: boolean) {
    return prisma.user.update({
      where: { id },
      data: { patientCapability: value },
    });
  }
}
