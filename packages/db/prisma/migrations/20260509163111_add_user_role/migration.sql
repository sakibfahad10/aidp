-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role";
