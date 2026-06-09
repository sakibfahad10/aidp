import type { AvailabilitySlot, ToggleAvailabilitySlotResult } from "@disease-prediction/shared";
import { SlotStatus } from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import {
  AvailabilityRepository,
  type AvailabilityRepositoryLike,
  type AvailabilitySlotRow,
} from "../repositories/availabilityRepository";

function toWire(row: AvailabilitySlotRow): AvailabilitySlot {
  return {
    id: row.id,
    doctorId: row.doctorId,
    startTime: row.startTime.toISOString(),
    status: row.status,
  };
}

/**
 * Availability editor — the deep module behind the doctor dashboard's
 * grid-toggle UI. Materializes one concrete `AvailabilitySlot` row per
 * toggled cell, removes the row when the same cell is toggled off, and
 * refuses to remove a row that has already been booked.
 *
 * No recurrence: every slot is a single absolute moment. The toggle is
 * idempotent at the row level — a duplicate "create" on the same
 * `(doctorId, startTime)` is impossible thanks to the model's
 * `@@unique([doctorId, startTime])` constraint.
 */
export class AvailabilityService {
  constructor(private readonly repo: AvailabilityRepositoryLike = new AvailabilityRepository()) {}

  /**
   * Toggle a single grid cell.
   *
   * - No row at `startTime` → create an `open` row, return `{ action: "created" }`.
   * - Existing `open` row → delete it, return `{ action: "removed" }`.
   * - Existing `booked` row → throw `409` so the editor can flag the cell
   *   as locked rather than silently no-op-ing.
   */
  async toggle(userId: string, startTime: Date): Promise<ToggleAvailabilitySlotResult> {
    const doctorId = await this.requireDoctorId(userId);
    const existing = await this.repo.findSlot(doctorId, startTime);

    if (existing) {
      if (existing.status === SlotStatus.BOOKED) {
        throw new AppError(409, "Slot is already booked and cannot be removed");
      }
      await this.repo.deleteById(existing.id);
      return { action: "removed", slot: null };
    }

    const created = await this.repo.create(doctorId, startTime);
    return { action: "created", slot: toWire(created) };
  }

  /** Doctor-private listing of the editor's open slots. */
  async listOwnOpen(userId: string): Promise<AvailabilitySlot[]> {
    const doctorId = await this.requireDoctorId(userId);
    const rows = await this.repo.listOpenByDoctorId(doctorId);
    return rows.map(toWire);
  }

  /**
   * Apply the editor's preset / per-day "fill" actions in one atomic batch:
   * open the given moments (skipping any already-open or `booked`) and remove
   * the given still-`open` moments. Returns the resulting open slots.
   */
  async bulkSet(userId: string, open: Date[], close: Date[]): Promise<AvailabilitySlot[]> {
    const doctorId = await this.requireDoctorId(userId);
    const rows = await this.repo.bulkApply(doctorId, open, close);
    return rows.map(toWire);
  }

  /** All slots in a date range — backs the editor's week view. */
  async listOwnInRange(userId: string, from: Date, to: Date): Promise<AvailabilitySlot[]> {
    const doctorId = await this.requireDoctorId(userId);
    const rows = await this.repo.listByDoctorIdInRange(doctorId, from, to);
    return rows.map(toWire);
  }

  /** Public listing — used by the directory and the public profile. */
  async listOpenForDoctor(doctorId: string): Promise<AvailabilitySlot[]> {
    const rows = await this.repo.listOpenByDoctorId(doctorId);
    return rows.map(toWire);
  }

  private async requireDoctorId(userId: string): Promise<string> {
    const doctorId = await this.repo.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new AppError(403, "Only doctors can edit availability");
    }
    return doctorId;
  }
}
