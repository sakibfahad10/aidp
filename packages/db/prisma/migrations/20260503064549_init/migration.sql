-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('symptom', 'structured', 'report');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'moderate', 'high', 'critical');

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "inputType" "InputType" NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "summary" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prediction_createdAt_idx" ON "Prediction"("createdAt");

-- CreateIndex
CREATE INDEX "Prediction_riskLevel_idx" ON "Prediction"("riskLevel");

-- CreateIndex
CREATE INDEX "Prediction_inputType_idx" ON "Prediction"("inputType");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
