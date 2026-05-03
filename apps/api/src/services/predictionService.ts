import {
  InputType,
  PredictionPayload,
  AIPredictionResponse,
} from "@disease-prediction/shared";
import { GeminiService } from "./geminiService";
import { PredictionRepository } from "../repositories/predictionRepository";
import { AppError } from "../middlewares/errorHandler";

/**
 * PredictionService orchestrates the prediction flow:
 * 1. Sends input to Gemini AI
 * 2. Stores the prediction in the database
 * 3. Returns the result
 */
export class PredictionService {
  private geminiService: GeminiService;
  private predictionRepo: PredictionRepository;

  constructor() {
    this.geminiService = new GeminiService();
    this.predictionRepo = new PredictionRepository();
  }

  /** Run a new prediction */
  async predict(inputType: InputType, payload: PredictionPayload) {
    // Get AI prediction
    const aiResult: AIPredictionResponse = await this.geminiService.predict(
      inputType,
      payload
    );

    // Store in database
    const prediction = await this.predictionRepo.create(
      inputType,
      payload,
      aiResult
    );

    return prediction;
  }

  /** Get all predictions with pagination */
  async getAll(page?: number, limit?: number) {
    return this.predictionRepo.findAll(page, limit);
  }

  /** Get a single prediction by ID */
  async getById(id: string) {
    const prediction = await this.predictionRepo.findById(id);
    if (!prediction) {
      throw new AppError(404, "Prediction not found");
    }
    return prediction;
  }
}
