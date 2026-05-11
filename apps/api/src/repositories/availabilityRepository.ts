import { type SlotStatus as PrismaSlotStatus, prisma } from "@disease-prediction/db";
import type { SlotStatus } from "@disease-prediction/shared";

/**
 * Internal row shape — Prisma row narrowed to the columns the service uses.
 * Kept separate from the wire `AvailabilitySlot` so the service can decide
 * how `startTime` is serialized.
 */
export interface AvailabilitySlotRow {
  id: string;
  doctorId: string;
  startTime: Date;
  status: SlotStatus;
  createdAt: Date;
  updatedAt: Date;
}

function toRow(row: {
  id: string;
  doctorId: string;
  startTime: Date;
  status: PrismaSlotStatus;
  createdAt: Date;
  updatedAt: Date;
}): AvailabilitySlotRow {
  return {
    id: row.id,
    doctorId: row.doctorId,
    startTime: row.startTime,
    status: row.status as unknown as SlotStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class AvailabilityRepository {
  async findDoctorIdByUserId(userId: string): Promise<string | null> {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  async findSlot(doctorId: string, startTime: Date): Promise<AvailabilitySlotRow | null> {
    const row = await prisma.availabilitySlot.findUnique({
      where: { doctorId_startTime: { doctorId, startTime } },
    });
    return row ? toRow(row) : null;
  }

  async findById(id: string): Promise<AvailabilitySlotRow | null> {
    const row = await prisma.availabilitySlot.findUnique({ where: { id } });
    return row ? toRow(row) : null;
  }

  async create(doctorId: string, startTime: Date): Promise<AvailabilitySlotRow> {
    const row = await prisma.availabilitySlot.create({
      data: { doctorId, startTime, status: "open" as PrismaSlotStatus },
    });
    return toRow(row);
  }

  async deleteById(id: string): Promise<void> {
    await prisma.availabilitySlot.delete({ where: { id } });
  }

  async listOpenByDoctorId(doctorId: string): Promise<AvailabilitySlotRow[]> {
    const rows = await prisma.availabilitySlot.findMany({
      where: { doctorId, status: "open" as PrismaSlotStatus },
      orderBy: { startTime: "asc" },
    });
    return rows.map(toRow);
  }

  async listByDoctorIdInRange(
    doctorId: string,
    from: Date,
    to: Date,
  ): Promise<AvailabilitySlotRow[]> {
    const rows = await prisma.availabilitySlot.findMany({
      where: { doctorId, startTime: { gte: from, lt: to } },
      orderBy: { startTime: "asc" },
    });
    return rows.map(toRow);
  }
}

export interface AvailabilityRepositoryLike {
  findDoctorIdByUserId(userId: string): Promise<string | null>;
  findSlot(doctorId: string, startTime: Date): Promise<AvailabilitySlotRow | null>;
  findById(id: string): Promise<AvailabilitySlotRow | null>;
  create(doctorId: string, startTime: Date): Promise<AvailabilitySlotRow>;
  deleteById(id: string): Promise<void>;
  listOpenByDoctorId(doctorId: string): Promise<AvailabilitySlotRow[]>;
  listByDoctorIdInRange(doctorId: string, from: Date, to: Date): Promise<AvailabilitySlotRow[]>;
}
