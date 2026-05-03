import {
  InputType,
  PredictionPayload,
  AIPredictionResponse,
} from "@disease-prediction/shared";
import { GeminiService } from "./geminiService";
import { PredictionRepository } from "../repositories/predictionRepository";
import { AppError } from "../middlewares/errorHandler";

export class PredictionService {
  private geminiService: GeminiService;
  private predictionRepo: PredictionRepository;

  constructor() {
    this.geminiService = new GeminiService();
    this.predictionRepo = new PredictionRepository();
  }

  async predict(inputType: InputType, payload: PredictionPayload, userId: string) {
    const aiResult: AIPredictionResponse = await this.geminiService.predict(
      inputType,
      payload
    );

    const prediction = await this.predictionRepo.create(
      inputType,
      payload,
      aiResult,
      userId
    );

    return prediction;
  }

  async getAll(page?: number, limit?: number, userId?: string) {
    return this.predictionRepo.findAll(page, limit, userId);
  }

  async getById(id: string, userId?: string) {
    const prediction = await this.predictionRepo.findById(id, userId);
    if (!prediction) {
      throw new AppError(404, "Prediction not found");
    }
    return prediction;
  }
}
