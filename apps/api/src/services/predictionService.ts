import {
  type AIPredictionResponse,
  type AllowedReportFileMimeType,
  InputType,
  type PredictionPayload,
  type ReportFileMetadata,
} from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import { PredictionRepository } from "../repositories/predictionRepository";
import { GeminiService } from "./geminiService";

export interface ReportFileInput {
  buffer: Buffer;
  mimeType: AllowedReportFileMimeType;
  fileName: string;
  fileSizeBytes: number;
}

export class PredictionService {
  private geminiService: GeminiService;
  private predictionRepo: PredictionRepository;

  constructor() {
    this.geminiService = new GeminiService();
    this.predictionRepo = new PredictionRepository();
  }

  async predict(inputType: InputType, payload: PredictionPayload, userId: string) {
    const aiResult: AIPredictionResponse = await this.geminiService.predict(inputType, payload);

    const prediction = await this.predictionRepo.create(inputType, payload, aiResult, userId);

    return prediction;
  }

  async predictFromReportFile(
    file: ReportFileInput,
    reportType: string | undefined,
    userId: string,
  ) {
    const aiResult = await this.geminiService.predictFromReportFile(
      file.buffer,
      file.mimeType,
      reportType,
    );

    const metadata: ReportFileMetadata = {
      reportType,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSizeBytes: file.fileSizeBytes,
    };

    return this.predictionRepo.create(InputType.REPORT, metadata, aiResult, userId);
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
