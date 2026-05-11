import { z } from "zod";

/**
 * Lifecycle status of a concrete `AvailabilitySlot`.
 *
 * String values mirror the Prisma enum exactly so values flow across the
 * boundary without remapping.
 */
export enum SlotStatus {
  OPEN = "open",
  BOOKED = "booked",
}

export const slotStatusSchema = z.nativeEnum(SlotStatus);

/**
 * One concrete bookable slot. The availability editor materializes one row
 * per toggled grid cell; no recurrence — `startTime` is always an explicit
 * absolute moment.
 */
export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  startTime: string;
  status: SlotStatus;
}

/**
 * Body of POST /api/v1/doctors/me/availability/toggle — the editor sends the
 * slot's `startTime` (ISO 8601) it just toggled on, and the API either
 * materializes a fresh `open` row or, if a row already exists at that moment
 * and is still `open`, removes it. A `booked` row is a no-op (guarded).
 */
export const toggleAvailabilitySlotRequestSchema = z.object({
  startTime: z
    .string()
    .datetime({ offset: true, message: "startTime must be a valid ISO 8601 timestamp" }),
});

export type ToggleAvailabilitySlotRequest = z.infer<typeof toggleAvailabilitySlotRequestSchema>;

/** Outcome of a toggle: what the editor needs to repaint the cell. */
export interface ToggleAvailabilitySlotResult {
  action: "created" | "removed";
  slot: AvailabilitySlot | null;
}
