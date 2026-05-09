import { type Role as PrismaRole, prisma } from "@disease-prediction/db";
import type { Role } from "@disease-prediction/shared";

function toPrismaRole(role: Role): PrismaRole {
  return role as PrismaRole;
}

function fromPrismaRole(role: PrismaRole | null): Role | null {
  return role === null ? null : (role as Role);
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
    if (!user) return null;
    return fromPrismaRole(user.role);
  }

  async setRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: { role: toPrismaRole(role) },
    });
  }
}
