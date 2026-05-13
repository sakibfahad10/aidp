import {
  type InputType as PrismaInputType,
  type RiskLevel as PrismaRiskLevel,
  prisma,
} from "@disease-prediction/db";
import {
  type AIPredictionResponse,
  type PredictionPayload,
  InputType as SharedInputType,
  RiskLevel as SharedRiskLevel,
} from "@disease-prediction/shared";
import type { BriefingInputPrediction } from "../services/briefingProjection";

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
    userId: string,
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

  /**
   * Most recent `limit` predictions for a user, projected straight into
   * the briefing projection's input shape. Lives on the repository so the
   * Prisma row → wire-string-shape mapping (`createdAt.toISOString()`,
   * enum casts) has one home.
   */
  async listRecentForUser(userId: string, limit: number): Promise<BriefingInputPrediction[]> {
    const rows = await prisma.prediction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        inputType: true,
        riskLevel: true,
        summary: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      inputType: row.inputType,
      // Prisma `RiskLevel` enum values are identical strings to the shared
      // `RiskLevel` enum values, so this is a same-string cast at the
      // boundary — no runtime conversion needed.
      riskLevel: row.riskLevel as unknown as SharedRiskLevel,
      summary: row.summary,
    }));
  }
}

export interface PredictionRepositoryLike {
  listRecentForUser(userId: string, limit: number): Promise<BriefingInputPrediction[]>;
}
