import { type HealthProfile as PrismaHealthProfile, prisma } from "@disease-prediction/db";
import type { HealthProfile, HealthProfileField } from "@disease-prediction/shared";

function toHealthProfile(row: PrismaHealthProfile): HealthProfile {
  return {
    age: row.age,
    gender: row.gender,
    bloodType: row.bloodType,
    conditions: row.conditions,
    medications: row.medications,
    allergies: row.allergies,
    editedFields: row.editedFields as HealthProfileField[],
  };
}

export function emptyHealthProfile(): HealthProfile {
  return {
    age: null,
    gender: null,
    bloodType: null,
    conditions: [],
    medications: [],
    allergies: [],
    editedFields: [],
  };
}

export class HealthProfileRepository {
  async findByUserId(userId: string): Promise<HealthProfile | null> {
    const row = await prisma.healthProfile.findUnique({ where: { userId } });
    return row ? toHealthProfile(row) : null;
  }

  async getOrEmpty(userId: string): Promise<HealthProfile> {
    const existing = await this.findByUserId(userId);
    if (!existing) return emptyHealthProfile();
    return {
      age: existing.age,
      gender: existing.gender,
      bloodType: existing.bloodType,
      conditions: [...existing.conditions],
      medications: [...existing.medications],
      allergies: [...existing.allergies],
      editedFields: [...existing.editedFields],
    };
  }

  async upsert(userId: string, data: HealthProfile): Promise<HealthProfile> {
    const values = {
      age: data.age,
      gender: data.gender,
      bloodType: data.bloodType,
      conditions: data.conditions,
      medications: data.medications,
      allergies: data.allergies,
      editedFields: data.editedFields,
    };
    const row = await prisma.healthProfile.upsert({
      where: { userId },
      create: { userId, ...values },
      update: values,
    });
    return toHealthProfile(row);
  }
}

/**
 * Minimal repository surface depended on by the briefing service. Lets
 * tests inject a fake without dragging Prisma along.
 */
export interface HealthProfileRepositoryLike {
  findByUserId(userId: string): Promise<HealthProfile | null>;
}
