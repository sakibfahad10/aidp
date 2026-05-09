import { type Role as PrismaRole, prisma } from "@disease-prediction/db";
import type { Role } from "@disease-prediction/shared";

// Shared `Role` and Prisma `Role` are distinct types but share identical string
// values, so a direct cast at the boundary is sound.

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
      data: { role: role as PrismaRole },
    });
  }
}
