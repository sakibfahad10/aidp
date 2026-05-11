-- AlterTable
ALTER TABLE "User" ADD COLUMN     "patientCapability" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing PATIENT users should already have patient capability
-- (their primary role *is* patient). DOCTOR users remain at the default
-- false until they hit the "register as a patient" action.
UPDATE "User" SET "patientCapability" = true WHERE "role" = 'PATIENT';
