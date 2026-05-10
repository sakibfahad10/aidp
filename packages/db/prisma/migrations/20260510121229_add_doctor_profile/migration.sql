-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('GeneralMedicine', 'Cardiology', 'Endocrinology', 'Dermatology', 'Gastroenterology', 'Neurology', 'Pulmonology', 'Nephrology', 'Orthopedics', 'Rheumatology', 'Pediatrics', 'Psychiatry', 'Gynecology', 'ENT', 'Ophthalmology', 'Urology', 'InfectiousDisease', 'GeneralSurgery');

-- CreateEnum
CREATE TYPE "City" AS ENUM ('Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh');

-- CreateEnum
CREATE TYPE "DoctorStatus" AS ENUM ('draft', 'pending', 'verified');

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "publicEmail" TEXT,
    "bmdcNumber" TEXT,
    "qualifications" TEXT,
    "specialties" "Specialty"[],
    "affiliation" TEXT,
    "city" "City",
    "experienceYears" INTEGER,
    "feeBdt" INTEGER,
    "status" "DoctorStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_bmdcNumber_key" ON "DoctorProfile"("bmdcNumber");

-- CreateIndex
CREATE INDEX "DoctorProfile_status_idx" ON "DoctorProfile"("status");

-- CreateIndex
CREATE INDEX "DoctorProfile_city_idx" ON "DoctorProfile"("city");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
