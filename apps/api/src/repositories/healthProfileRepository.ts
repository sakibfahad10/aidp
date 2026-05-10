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

export interface HealthProfileWriteable {
  age: number | null;
  gender: string | null;
  bloodType: string | null;
  conditions: string[];
  medications: string[];
  allergies: string[];
  editedFields: HealthProfileField[];
}

const EMPTY: HealthProfileWriteable = {
  age: null,
  gender: null,
  bloodType: null,
  conditions: [],
  medications: [],
  allergies: [],
  editedFields: [],
};

export class HealthProfileRepository {
  async findByUserId(userId: string): Promise<HealthProfile | null> {
    const row = await prisma.healthProfile.findUnique({ where: { userId } });
    return row ? toHealthProfile(row) : null;
  }

  async getOrEmpty(userId: string): Promise<HealthProfileWriteable> {
    const existing = await this.findByUserId(userId);
    if (!existing) return { ...EMPTY };
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

  async upsert(userId: string, data: HealthProfileWriteable): Promise<HealthProfile> {
    const row = await prisma.healthProfile.upsert({
      where: { userId },
      create: {
        userId,
        age: data.age,
        gender: data.gender,
        bloodType: data.bloodType,
        conditions: data.conditions,
        medications: data.medications,
        allergies: data.allergies,
        editedFields: data.editedFields,
      },
      update: {
        age: data.age,
        gender: data.gender,
        bloodType: data.bloodType,
        conditions: data.conditions,
        medications: data.medications,
        allergies: data.allergies,
        editedFields: data.editedFields,
      },
    });
    return toHealthProfile(row);
  }
}
