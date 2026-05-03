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

function toPrismaInputType(inputType: SharedInputType): PrismaInputType {
  const map: Record<SharedInputType, PrismaInputType> = {
    [SharedInputType.SYMPTOM]: "symptom",
    [SharedInputType.STRUCTURED]: "structured",
    [SharedInputType.REPORT]: "report",
  };
  return map[inputType];
}

function toPrismaRiskLevel(riskLevel: SharedRiskLevel): PrismaRiskLevel {
  const map: Record<SharedRiskLevel, PrismaRiskLevel> = {
    [SharedRiskLevel.LOW]: "low",
    [SharedRiskLevel.MODERATE]: "moderate",
    [SharedRiskLevel.HIGH]: "high",
    [SharedRiskLevel.CRITICAL]: "critical",
  };
  return map[riskLevel];
}

export class PredictionRepository {
  async create(
    inputType: SharedInputType,
    inputPayload: PredictionPayload,
    result: AIPredictionResponse,
    userId: string
  ) {
    return prisma.prediction.create({
      data: {
        inputType: toPrismaInputType(inputType),
        inputPayload: inputPayload as object,
        result: result as object,
        riskLevel: toPrismaRiskLevel(result.riskLevel),
        summary: result.summary,
        userId,
      },
    });
  }

  async findAll(page = 1, limit = 20, userId?: string) {
    const skip = (page - 1) * limit;
    const where = userId ? { userId } : {};

    const [items, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.prediction.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string, userId?: string) {
    const where = userId ? { id, userId } : { id };
    return prisma.prediction.findFirst({ where });
  }
}
