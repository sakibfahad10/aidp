import { prisma } from "@disease-prediction/db";
import {
  InputType as SharedInputType,
  RiskLevel as SharedRiskLevel,
  AIPredictionResponse,
  PredictionPayload,
} from "@disease-prediction/shared";
import {
  InputType as PrismaInputType,
  RiskLevel as PrismaRiskLevel,
} from "@disease-prediction/db";

/**
 * Maps shared InputType enum values to Prisma InputType enum values
 */
function toPrismaInputType(inputType: SharedInputType): PrismaInputType {
  const map: Record<SharedInputType, PrismaInputType> = {
    [SharedInputType.SYMPTOM]: "symptom",
    [SharedInputType.STRUCTURED]: "structured",
    [SharedInputType.REPORT]: "report",
  };
  return map[inputType];
}

/**
 * Maps shared RiskLevel enum values to Prisma RiskLevel enum values
 */
function toPrismaRiskLevel(riskLevel: SharedRiskLevel): PrismaRiskLevel {
  const map: Record<SharedRiskLevel, PrismaRiskLevel> = {
    [SharedRiskLevel.LOW]: "low",
    [SharedRiskLevel.MODERATE]: "moderate",
    [SharedRiskLevel.HIGH]: "high",
    [SharedRiskLevel.CRITICAL]: "critical",
  };
  return map[riskLevel];
}

/**
 * PredictionRepository handles all database operations for predictions.
 * Keeps Prisma logic isolated from business logic.
 */
export class PredictionRepository {
  /** Create a new prediction record */
  async create(
    inputType: SharedInputType,
    inputPayload: PredictionPayload,
    result: AIPredictionResponse
  ) {
    return prisma.prediction.create({
      data: {
        inputType: toPrismaInputType(inputType),
        inputPayload: inputPayload as object,
        result: result as object,
        riskLevel: toPrismaRiskLevel(result.riskLevel),
        summary: result.summary,
      },
    });
  }

  /** Get all predictions ordered by creation date */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.prediction.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.prediction.count(),
    ]);

    return { items, total, page, limit };
  }

  /** Get a single prediction by ID */
  async findById(id: string) {
    return prisma.prediction.findUnique({
      where: { id },
    });
  }
}
